import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import JSON5 from "json5";
import { parseStreamMessage } from "../../chat/route";
import { readDataStream } from "../../chat/read-data-stream";
import { LangChainResponse } from "@/app/types/chat";

const TOKEN_NAME = "auth_token";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const abortController = new AbortController();

    const response = await fetch(
      `https://api.zeno-staging.ds.io/api/threads/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    // Check if the response is streaming
    if (!response.body) {
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
          await readDataStream({
            abortController,
            reader,
            onData: (data: string) => {
              try {
                const langChainMessage: LangChainResponse = JSON.parse(data);

                const messageType = langChainMessage.node;
                const message = langChainMessage.update;
                const updateObject = JSON5.parse(message);

                if (messageType === "human") {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: "human",
                        text: updateObject.messages[0].kwargs.content,
                        timestamp: Date.now(),
                      }) + "\n"
                    )
                  );
                  return;
                }

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
            },
          });
        } catch (error) {
          console.error("Streaming error:", error);
          if (!abortController.signal.aborted) {
            controller.error(error);
          }
        } finally {
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
    console.log("error", error);
  }
}
