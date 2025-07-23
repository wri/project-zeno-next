import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseStreamMessage } from "../../chat/route";

const TOKEN_NAME = "auth_token";

const fauxData = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "single-thread-stream.json"), "utf-8")
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a streaming response that parses LangChain and sends simplified messages
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const data of fauxData) {
          const encoder = new TextEncoder();

          const langChainMessage = data;

          const messageType = langChainMessage.node;
          const updateObject = langChainMessage.update;

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
            continue;
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
        }
        controller.close();
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
