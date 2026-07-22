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
  // Extract trace identifier from response metadata (canonical field)
  const responseMetadata =
    (kwargs.response_metadata as
      | { trace_id?: string; msg_type?: string; dashboard_id?: string }
      | undefined) || undefined;
  const traceId = responseMetadata?.trace_id;

  // A write signal (e.g. dashboard_updated) rides on a tool message's
  // response_metadata, but that message is not necessarily the last one in
  // the update (the agent's narration can follow it in the same update), and
  // the carrying message may be classified as an error. Scan every message so
  // the signal rides on whatever StreamMessage this update produces.
  let writeSignal: { msg_type: string; dashboard_id?: string } | undefined;
  for (const message of langChainMessage.messages ?? []) {
    const meta = message?.kwargs?.response_metadata as
      | { msg_type?: string; dashboard_id?: string }
      | undefined;
    if (meta?.msg_type) {
      writeSignal = {
        msg_type: meta.msg_type,
        dashboard_id: meta.dashboard_id,
      };
      break;
    }
  }

  if (messageType === "human") {
    return {
      type: "human",
      text: content as string,
      aoi: langChainMessage.aoi || undefined,
      aoi_selection: langChainMessage.aoi_selection || undefined,
      timestamp: timestamp.toISOString(),
      start_date: langChainMessage.start_date,
      end_date: langChainMessage.end_date,
      trace_id: traceId,
    };
  } else if (messageType === "tools") {
    // Check if this is an error from a tool. `status` is the canonical
    // signal; the "Error:" prefix is a legacy one from older backend tool
    // errors that carried no status. Prefix only — a successful result that
    // merely mentions "Error:" mid-content must not be classified as one.
    if (
      kwargs.status === "error" ||
      (typeof content === "string" && content.startsWith("Error:"))
    ) {
      return {
        type: "error",
        name: kwargs.name,
        content: typeof content === "string" ? content : String(content),
        timestamp: timestamp.toISOString(),
        trace_id: traceId,
        ...(writeSignal ?? {}),
      };
    }

    // For tool messages, extract state updates
    return {
      type: "tool",
      name: kwargs.name,
      content: typeof content === "string" ? content : String(content),
      dataset: langChainMessage.dataset || undefined,
      suggested_datasets: langChainMessage.suggested_datasets || undefined,
      insights: langChainMessage.insights || [],
      charts_data: langChainMessage.charts_data || [],
      insight_id: langChainMessage.insight_id || undefined,
      codeact_parts: langChainMessage.codeact_parts || [],
      source_urls: langChainMessage.source_urls || [],
      cited_articles: langChainMessage.cited_articles || undefined,
      insight_count: langChainMessage.insight_count || 0,
      aoi: langChainMessage.aoi || undefined,
      aoi_selection: langChainMessage.aoi_selection || undefined,
      timestamp: timestamp.toISOString(),
      trace_id: traceId,
      // Write signals (e.g. dashboard_updated) ride along so the client can
      // refetch what the agent just changed.
      msg_type: writeSignal?.msg_type,
      dashboard_id: writeSignal?.dashboard_id,
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

    // Names of the tools this AI message is announcing. The agent emits the
    // tool call before the tool result streams back, so this is the earliest
    // signal that a given tool (e.g. generate_insights) is about to run.
    const toolCalls = Array.isArray(kwargs.tool_calls)
      ? kwargs.tool_calls
          .map((tc) =>
            tc && typeof tc === "object" && "name" in tc
              ? (tc as { name?: unknown }).name
              : undefined
          )
          .filter((n): n is string => typeof n === "string")
      : [];

    // Only return a message if we have valid text content
    // TODO: This function emits StreamMessage.type = "text" for assistant messages.
    // Consider renaming to "assistant" for clarity and updating client handling
    // (keep a temporary backward-compat branch for "text").
    if (textContent && typeof textContent === "string" && textContent.trim()) {
      return {
        type: "text",
        text: textContent.trim(),
        timestamp: timestamp.toISOString(),
        trace_id: traceId,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        ...(writeSignal ?? {}),
      };
    }

    // No text, but the agent announced tool calls (a pure tool-call turn).
    // Surface them so the UI can reflect pending work — without this, the
    // message would be dropped and the insight skeleton would never know an
    // analysis is on the way.
    if (toolCalls.length) {
      return {
        type: "other",
        name: "tool_calls",
        tool_calls: toolCalls,
        timestamp: timestamp.toISOString(),
        trace_id: traceId,
      };
    }
  }

  // Return null if we couldn't parse the message
  return null;
}
