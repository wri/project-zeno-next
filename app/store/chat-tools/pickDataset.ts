import { ChatMessage, StreamMessage } from "@/app/types/chat";

export function pickDatasetTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {
  // Example: include dataset name and description if present
  const dataset_name = streamMessage.dataset?.dataset_name || "Unknown dataset";
  const reasoning = streamMessage.dataset?.reason || "Unknown reasoning";

  addMessage({
    type: "assistant",
    message: `Dataset picker tool executed: selected ${dataset_name}.\n\nReason: ${reasoning}\n`,
  });
}