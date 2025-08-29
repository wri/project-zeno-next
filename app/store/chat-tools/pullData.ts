import { ChatMessage, StreamMessage } from "@/app/types/chat";

export function pullDataTool(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  streamMessage: StreamMessage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  // Tool execution is now handled by the reasoning component
  // No message needed here
}
