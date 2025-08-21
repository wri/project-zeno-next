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
  timestamp: Date = new Date()
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
      timestamp: timestamp.toISOString()
    };
  } else if (messageType === "agent") {
    // For AI messages, handle different content formats
    let textContent = null;

    if (typeof content === "string") {
      // Content is a direct string
      textContent = content;
    } else if (content && typeof content === "object") {
      const contentObj = content as Record<string, unknown>;
      if (contentObj.text && typeof contentObj.text === "string") {
        // Content is an object with text property
        textContent = contentObj.text;
      } else if (Array.isArray(content) && content.length > 0) {
        // Content is an array of objects
        const firstItem = content[0] as Record<string, unknown>;
        if (firstItem.text && typeof firstItem.text === "string") {
          textContent = firstItem.text;
        } else if (typeof content[0] === "string") {
          textContent = content[0];
        }
      }
    }

    // Only return a message if we have valid text content
    if (textContent && typeof textContent === "string" && textContent.trim()) {
      return {
        type: "text",
        text: textContent.trim(),
        timestamp: timestamp.toISOString(),
      };
    }
  }

  // Return null if we couldn't parse the message
  return null;
}
