import { ChatMessage, StreamMessage } from "@/app/types/chat";

export function pullDataTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {}
