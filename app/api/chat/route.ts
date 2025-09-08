import { NextRequest, NextResponse } from "next/server";
import JSON5 from "json5";
import {
  ChatAPIRequest,
  LangChainResponse,
  StreamMessage,
} from "@/app/types/chat";
import { readDataStream } from "../shared/read-data-stream";
import { API_CONFIG } from "@/app/config/api";
import { parseStreamMessage } from "../shared/parse-stream-message";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "../shared/utils";

export async function POST(request: NextRequest) {
  try {
    let token = await getAuthToken();

    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChatAPIRequest = await request.json();
    const { query, query_type, thread_id, ui_context } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    if (!query_type || typeof query_type !== "string") {
      return NextResponse.json(
        { error: "Query type is required and must be a string" },
        { status: 400 }
      );
    }

    if (!thread_id || typeof thread_id !== "string") {
      return NextResponse.json(
        { error: "Thread ID is required and must be a string" },
        { status: 400 }
      );
    }

    // Create AbortController for timeout and cleanup
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(
        "SERVER TIMEOUT: Request exceeded 5 minutes - aborting stream"
      );
      abortController.abort();
    }, 300000); // 5 minute timeout

    // Check if we should use test error endpoint instead of real API
    const testErrorType = process.env.TEST_ERROR;
    let response;

    if (testErrorType) {
      console.log(
        "TEST_ERROR mode enabled, using mock endpoint with type:",
        testErrorType
      );

      // Call our local test-error endpoint instead of the real API
      const testUrl = new URL("/api/test-error", request.url);
      testUrl.searchParams.set("type", testErrorType);

      response = await fetch(testUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
      });
    } else {
      // Normal flow - call the real Zeno API
      response = await fetch(API_CONFIG.ENDPOINTS.CHAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(await getAPIRequestHeaders()),
        },
        body: JSON.stringify({
          query,
          query_type,
          thread_id,
          ...(ui_context && { ui_context }),
        }),
        signal: abortController.signal,
      });
    }

    console.log("External API response status:", response.status);

    if (!response.ok) {
      clearTimeout(timeoutId);
      throw new Error(`External API responded with status: ${response.status}`);
    }

    // Check if the response is streaming
    if (!response.body) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "No response body received" },
        { status: 500 }
      );
    }

    // Create a streaming response that parses LangChain and sends simplified messages
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = response.body!.getReader();

        try {
          // Set up cleanup for abort signal
          const onAbort = () => {
            // cleanup
            abortController.signal.removeEventListener("abort", onAbort);
            clearTimeout(timeoutId);

            console.log(
              "ABORT TRIGGERED: Stream aborted - cleaning up and sending timeout message"
            );

            // Send timeout message to frontend before closing
            try {
              const timeoutMessage: StreamMessage = {
                type: "error",
                name: "timeout",
                content:
                  "Request timed out after 5 minutes. Please try a simpler query or try again later.",
                timestamp: new Date().toISOString(),
              };

              controller.enqueue(
                encoder.encode(JSON.stringify(timeoutMessage) + "\n")
              );
              console.log("TIMEOUT MESSAGE SENT to frontend");
            } catch (error) {
              console.error("Failed to send timeout message:", error);
            }

            reader.cancel().catch(console.error);

            // Small delay to ensure message is sent before closing
            setTimeout(() => {
              try {
                controller.close();
                console.log("CONTROLLER CLOSED after timeout");
              } catch {
                console.log("Controller already closed");
              }
            }, 100);
          };

          if (abortController.signal.aborted) {
            onAbort();
            return;
          }

          abortController.signal.addEventListener("abort", onAbort);

          await readDataStream({
            abortController,
            reader,
            onData: (data: string, isFinal: boolean) => {
              try {
                const langChainMessage: LangChainResponse = JSON.parse(data);

                if (isFinal) {
                  console.log("Final LangChain message:", langChainMessage);
                }

                const message = langChainMessage.update;
                const updateObject = JSON5.parse(message);
                const date = langChainMessage.timestamp
                  ? new Date(langChainMessage.timestamp)
                  : new Date();

                const messageType = isFinal
                  ? "agent"
                  : (langChainMessage.node as "agent" | "tools");

                // Parse LangChain response and extract useful information
                const streamMessage = parseStreamMessage(
                  updateObject,
                  messageType,
                  date
                );

                if (streamMessage) {
                  controller.enqueue(
                    encoder.encode(JSON.stringify(streamMessage) + "\n")
                  );
                } else {
                  // Log unhandled content for debugging
                  console.log(
                    `Unhandled${isFinal ? " [final] " : " "}message type:`,
                    JSON.stringify(updateObject)
                  );
                }
              } catch (err) {
                console.error(
                  `Failed to parse${isFinal ? " [final] " : " "}message`,
                  data,
                  err
                );
              }
            },
          });

          abortController.signal.removeEventListener("abort", onAbort);
        } catch (error) {
          console.error("Streaming error:", error);
          if (!abortController.signal.aborted) {
            controller.error(error);
          }
        } finally {
          clearTimeout(timeoutId);
          if (!controller.desiredSize || controller.desiredSize === 0) {
            // Controller already closed
            return;
          }
          try {
            controller.close();
          } catch {
            // Controller might already be closed, ignore the error
            console.log("Controller already closed");
          }
        }
      },
    });

    // Forward prompts usage headers from upstream if present
    const getHeaderCaseInsensitive = (name: string): string | null => {
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase() === name.toLowerCase()) return value;
      }
      return null;
    };

    const promptsQuota = getHeaderCaseInsensitive("X-Prompts-Quota");
    const promptsUsed = getHeaderCaseInsensitive("X-Prompts-Used");

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        ...(promptsQuota ? { "X-Prompts-Quota": promptsQuota } : {}),
        ...(promptsUsed ? { "X-Prompts-Used": promptsUsed } : {}),
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
