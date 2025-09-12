import { LangChainUpdate, StreamMessage } from "@/app/types/chat";

/**
 * Parses a LangChain message into a simplified format for the frontend
 * @param langChainMessage - The raw LangChain message structure
 * @param messageType - The type of message: "agent", "tools", or "human"
 * @param timestamp - Optional timestamp for the message, defaults to current time
 * @returns Parsed StreamMessage or null if parsing fails
 */
export function parseStreamMessage(
  langChainMessage: LangChainUpdate,
  messageType: "agent" | "tools" | "human",
  timestamp: Date = new Date(),
  checkpoint_id?: string,
): StreamMessage | null {
  const lastMessage = langChainMessage.messages?.at(-1);
  // Validate input structure
  if (!langChainMessage || !lastMessage?.kwargs) {
    return null;
  }

  const kwargs = lastMessage.kwargs;
  const content = kwargs.content;

  if (messageType === "human") {
    return {
      type: "human",
      text: content as string,
      aoi: langChainMessage.aoi || undefined,
      timestamp: timestamp.toISOString(),
      start_date: langChainMessage.start_date,
      end_date: langChainMessage.end_date,
      checkpoint_id,
    };
  } else if (messageType === "tools") {
    // Check if this is an error from a tool
    if (
      kwargs.status === "error" ||
      (typeof content === "string" && content.includes("Error:"))
    ) {
      return {
        type: "error",
        name: kwargs.name,
        content: typeof content === "string" ? content : String(content),
        timestamp: timestamp.toISOString(),
        checkpoint_id,
      };
    }

    // For tool messages, extract state updates
    return {
      type: "tool",
      name: kwargs.name,
      content: typeof content === "string" ? content : String(content),
      dataset: langChainMessage.dataset || undefined,
      insights: langChainMessage.insights || [],
      charts_data: langChainMessage.charts_data || [],
      insight_count: langChainMessage.insight_count || 0,
      aoi: langChainMessage.aoi || undefined,
      timestamp: timestamp.toISOString(),
      checkpoint_id,
    };
  } else if (messageType === "agent") {
    // For AI messages, handle different content formats
    let textContent: string | null = null;

    const isThinking = (item: unknown): boolean =>
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      (item as { type: unknown }).type === "thinking";

    if (typeof content === "string") {
      textContent = content;
    } else if (Array.isArray(content) && content.length > 0) {
      // Find first non-thinking segment from array content
      const firstValid = content.find((item: unknown) => !isThinking(item));
      if (typeof firstValid === "string") {
        textContent = firstValid;
      } else if (
        firstValid &&
        typeof firstValid === "object" &&
        "text" in firstValid &&
        typeof (firstValid as { text?: unknown }).text === "string"
      ) {
        textContent = (firstValid as { text: string }).text;
      }
    } else if (
      content &&
      typeof content === "object" &&
      "text" in (content as Record<string, unknown>) &&
      typeof (content as { text?: unknown }).text === "string"
    ) {
      textContent = (content as { text: string }).text;
    }

    // Only return a message if we have valid text content
    if (textContent && typeof textContent === "string" && textContent.trim()) {
      return {
        type: "text",
        text: textContent.trim(),
        timestamp: timestamp.toISOString(),
        checkpoint_id,
      };
    }
  }

  // Return null if we couldn't parse the message
  return null;
}
