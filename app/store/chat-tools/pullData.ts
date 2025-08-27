import { ChatMessage, StreamMessage } from "@/app/types/chat";

export function pullDataTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  addMessage({
    type: "assistant",
    message: `Data pull tool executed.`,
    timestamp: streamMessage.timestamp,
  });
}
