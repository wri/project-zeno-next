import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import JSON5 from "json5";
import { readDataStream } from "../../shared/read-data-stream";
import { LangChainResponse, StreamMessage } from "@/app/types/chat";
import { API_CONFIG } from "@/app/config/api";
import { parseStreamMessage } from "../../shared/parse-stream-message";

// import fs from "fs";

const TOKEN_NAME = "auth_token";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create AbortController for timeout and cleanup
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(
        "SERVER TIMEOUT: Request exceeded 60 seconds - aborting stream"
      );
      abortController.abort();
    }, 60000); // 60 second timeout

    const response = await fetch(`${API_CONFIG.ENDPOINTS.THREADS}/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "External API error" },
        { status: response.status }
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

        // Set up cleanup for abort signal
        const onAbort = () => {
          clearTimeout(timeoutId);

          console.log(
            "ABORT TRIGGERED: Stream aborted - cleaning up and sending timeout message"
          );

          // Send timeout message to frontend before closing.
          try {
            const timeoutMessage: StreamMessage = {
              type: "error",
              name: "timeout",
              content: "Request timed out. Try again later.",
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

        abortController.signal.addEventListener("abort", onAbort, {
          once: true,
        });

        // const debugData: object[] = [];

        try {
          await readDataStream({
            abortController,
            reader,
            onData: (data: string) => {
              try {
                const langChainMessage: LangChainResponse = JSON.parse(data);

                const updateObject = JSON5.parse(langChainMessage.update);

                // debugData.push({ ...langChainMessage, update: updateObject });

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
                      new Date(langChainMessage.timestamp)
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

          // fs.writeFileSync(
          //   "single-thread-stream.json",
          //   JSON.stringify(debugData)
          // );
        } catch (error) {
          console.error("Streaming error:", error);
          if (!abortController.signal.aborted) {
            controller.error(error);
          }
        }

        try {
          controller.close();
        } catch {
          // Controller might already be closed, ignore the error
          console.log("Controller already closed");
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
    console.log("error", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.ENDPOINTS.THREADS}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
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
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.ENDPOINTS.THREADS}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
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
