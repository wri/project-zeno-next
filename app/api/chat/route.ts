import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import JSON5 from "json5";
import {
  ChatAPIRequest,
  LangChainResponse,
  LangChainUpdate,
  StreamMessage,
} from "@/app/types/chat";
import { readDataStream } from "./read-data-stream";

// Function to parse LangChain message into simplified format
// messageType is either "agent" or "tools"
export function parseStreamMessage(
  langChainMessage: LangChainUpdate,
  messageType: "agent" | "tools"
): StreamMessage | null {
  // Validate input structure
  if (!langChainMessage?.messages[0]?.kwargs) {
    return null;
  }

  const kwargs = langChainMessage.messages[0].kwargs;
  const content = kwargs.content;

  if (messageType === "tools") {
    // Check if this is an error from a tool
    if (
      kwargs.status === "error" ||
      (typeof content === "string" && content.includes("Error:"))
    ) {
      return {
        type: "error",
        name: kwargs.name,
        content: typeof content === "string" ? content : String(content),
        timestamp: Date.now(),
      };
    }

    // For tool messages, extract state updates
    return {
      type: "tool",
      name: kwargs.name,
      content: typeof content === "string" ? content : String(content),
      dataset: langChainMessage.dataset || undefined,
      insights: langChainMessage.insights || [],
      charts_data: langChainMessage.charts_data || [],
      insight_count: langChainMessage.insight_count || 0,
      aoi: langChainMessage.aoi || undefined,
      timestamp: Date.now(),
    };
  } else if (messageType === "agent") {
    // For AI messages, handle different content formats
    let textContent = null;

    if (typeof content === "string") {
      // Content is a direct string
      textContent = content;
    } else if (content && typeof content === "object") {
      const contentObj = content as Record<string, unknown>;
      if (contentObj.text && typeof contentObj.text === "string") {
        // Content is an object with text property
        textContent = contentObj.text;
      } else if (Array.isArray(content) && content.length > 0) {
        // Content is an array of objects
        const firstItem = content[0] as Record<string, unknown>;
        if (firstItem.text && typeof firstItem.text === "string") {
          textContent = firstItem.text;
        } else if (typeof content[0] === "string") {
          textContent = content[0];
        }
      }
    }

    // Only return a message if we have valid text content
    if (textContent && typeof textContent === "string" && textContent.trim()) {
      return {
        type: "text",
        text: textContent.trim(),
        timestamp: Date.now(),
      };
    }
  }

  // Return null if we couldn't parse the message
  return null;
}

const TOKEN_NAME = "auth_token";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChatAPIRequest = await request.json();
    const { query, query_type, thread_id } = body;

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
      response = await fetch("https://api.zeno-staging.ds.io/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          query_type,
          thread_id,
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
                timestamp: Date.now(),
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
              if (isFinal) {
                try {
                  const langChainMessage: LangChainResponse = JSON.parse(data);
                  console.log("Final LangChain message:", langChainMessage);

                  // Same parsing logic for final message
                  const update = langChainMessage.update;
                  const updateObject = JSON5.parse(update);
                  const streamMessage = parseStreamMessage(
                    updateObject,
                    "agent"
                  );

                  if (streamMessage) {
                    controller.enqueue(
                      encoder.encode(JSON.stringify(streamMessage) + "\n")
                    );
                  }
                } catch (err) {
                  console.error("Failed to parse final buffer", data, err);
                }
              } else {
                try {
                  const langChainMessage: LangChainResponse = JSON.parse(data);

                  const messageType = langChainMessage.node;
                  const message = langChainMessage.update;
                  const updateObject = JSON5.parse(message);

                  // Parse LangChain response and extract useful information
                  const streamMessage = parseStreamMessage(
                    updateObject,
                    messageType as "agent" | "tools"
                  );

                  // Send simplified message to client if we have something useful
                  if (streamMessage) {
                    controller.enqueue(
                      encoder.encode(JSON.stringify(streamMessage) + "\n")
                    );
                  } else {
                    // Log unhandled content for debugging
                    console.log(
                      "Unhandled message type:",
                      JSON.stringify(updateObject)
                    );
                  }
                } catch (err) {
                  console.error("Failed to parse line", data, err);
                }
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

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
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
