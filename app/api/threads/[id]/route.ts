import { NextRequest, NextResponse } from "next/server";
import JSON5 from "json5";
import { readDataStream } from "../../shared/read-data-stream";
import { LangChainResponse, StreamMessage } from "@/app/types/chat";
import { API_CONFIG } from "@/app/config/api";
import { parseStreamMessage } from "../../shared/parse-stream-message";
import {
  getAPIRequestHeaders,
  getAuthToken,
  getSessionToken,
} from "../../shared/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    let token = await getAuthToken();

    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create AbortController for timeout and cleanup
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(
        "SERVER TIMEOUT: Request exceeded 5 minutes - aborting stream"
      );
      abortController.abort();
    }, 300000); // 5 minute timeout

    const response = await fetch(`${API_CONFIG.ENDPOINTS.THREADS}/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      console.error(response);
      const upstreamStatus = response.status;
      const mappedStatus = upstreamStatus >= 500 ? 500 : 400;
      return NextResponse.json(
        { error: "External API error", status: upstreamStatus },
        { status: mappedStatus }
      );
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
        let controllerClosed = false;

        // Set up cleanup for abort signal
        const onAbort = () => {
          clearTimeout(timeoutId);

          if (controllerClosed) {
            return;
          }

          console.log(
            "ABORT TRIGGERED: Stream aborted - cleaning up and sending timeout message"
          );

          // Send timeout message to frontend before closing.
          try {
            const timeoutMessage: StreamMessage = {
              type: "error",
              name: "timeout",
              content: "Request timed out. Try again later.",
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
            if (controllerClosed) return;
            try {
              controller.close();
              controllerClosed = true;
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

        abortController.signal.addEventListener("abort", onAbort, {
          once: true,
        });

        try {
          await readDataStream({
            abortController,
            reader,
            onData: (data: string) => {
              try {
                const langChainMessage: LangChainResponse = JSON.parse(data);
                const checkpoint_id = langChainMessage.checkpoint_id;
                const updateObject = JSON5.parse(langChainMessage.update);

                const lastMessage = updateObject.messages?.at(-1);
                const type = lastMessage?.kwargs.type as
                  | "ai"
                  | "tool"
                  | "human"
                  | null;
                // Remap messages.
                const messageType = type
                  ? ({
                      ai: "agent",
                      tool: "tools",
                      human: "human",
                    }[type] as "agent" | "tools" | "human")
                  : null;

                // Parse LangChain response and extract useful information
                const streamMessage = messageType
                  ? parseStreamMessage(
                      updateObject,
                      messageType,
                      new Date(langChainMessage.timestamp),
                      checkpoint_id
                    )
                  : null;

                if (!streamMessage) {
                  // Log unhandled content for debugging
                  console.log(
                    "Unhandled message type:",
                    JSON.stringify(updateObject)
                  );
                  return;
                }

                // Send simplified message to client if we have something useful
                controller.enqueue(
                  encoder.encode(JSON.stringify(streamMessage) + "\n")
                );
              } catch (err) {
                console.error("Failed to parse line", data, err);
              }
            },
          });
        } catch (error) {
          console.error("Streaming error:", error);
          if (!abortController.signal.aborted) {
            controller.error(error);
          }
        }

        if (!controllerClosed) {
          try {
            controller.close();
            controllerClosed = true;
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
        // Prevent proxy/CDN buffering to allow progressive delivery
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    let token = await getAuthToken();

    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.ENDPOINTS.THREADS}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(response);
      const upstreamStatus = response.status;
      const mappedStatus = upstreamStatus >= 500 ? 500 : 400;
      return NextResponse.json(
        { error: "External API error", status: upstreamStatus },
        { status: mappedStatus }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    let token = await getAuthToken();

    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.ENDPOINTS.THREADS}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
    });

    if (!response.ok) {
      const upstreamStatus = response.status;
      const mappedStatus = upstreamStatus >= 500 ? 500 : 400;
      return NextResponse.json(
        { error: "External API error", status: upstreamStatus },
        { status: mappedStatus }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
