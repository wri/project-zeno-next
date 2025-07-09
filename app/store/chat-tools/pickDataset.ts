import { ChatMessage, StreamMessage } from "@/app/types/chat";

export function pickDatasetTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {
  addMessage({
    type: "assistant",
    message: `Dataset picker tool executed.`,
  });
}
