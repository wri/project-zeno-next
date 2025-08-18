import { ChatMessage, StreamMessage } from "@/app/types/chat";

export function pullDataTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {

  // Example: include dataset name and description if present
  const content = streamMessage?.content || "Unknown dataset";

  addMessage({
    type: "assistant",
    message: `${content}\n`,
  });
}
