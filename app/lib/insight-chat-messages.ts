import { ChatMessage, InsightWidget } from "@/app/types/chat";

// Matches the `[Chart <id>]` markers the backend is meant to inject into the
// assistant reply so cards can be placed positionally. `<id>` is hex/digits/
// hyphen (covers both UUID-style ids and the integer indices the backend emits).
const CHART_MARKER_RE = /\[Chart\s+[a-f0-9-]+\]/gi;

type AssistantChatMessage = Omit<ChatMessage, "id">;

/**
 * Builds the chat messages produced by a single assistant text chunk,
 * injecting any insight cards from the most recent `generate_insights` call.
 *
 * Two paths:
 *
 * 1. **Marker path** — when the reply text contains `[Chart N]` markers, each
 *    card is placed positionally where its marker appears.
 *
 * 2. **Fallback path** — staging (`origin/main`) delivers chart data via the
 *    `generate_insights` tool message but does NOT inject `[Chart N]` markers
 *    into the reply (that backend change currently lives on the
 *    `feat/fao-fra-handler` branch and is not deployed). Until it ships, render
 *    any pending cards immediately before the assistant text so the narrative
 *    reads as a conclusion to the charts above it. Remove this fallback once
 *    markers reach staging.
 *
 * `pendingWidgets` is the already-consumed batch from `insightStore` — the
 * caller owns the consume so this function stays pure and unit-testable.
 */
export function buildInsightChatMessages(
  text: string,
  pendingWidgets: InsightWidget[],
  timestamp: string,
  traceToUse?: string
): AssistantChatMessage[] {
  // Fresh regex instances: the `g` flag carries `lastIndex` across calls.
  const hasMarkers = new RegExp(CHART_MARKER_RE).test(text);

  if (hasMarkers) {
    return buildPositionalMessages(text, pendingWidgets, timestamp, traceToUse);
  }

  return buildFallbackMessages(text, pendingWidgets, timestamp, traceToUse);
}

// Marker path: split the text on `[Chart N]` markers and interleave cards.
function buildPositionalMessages(
  text: string,
  pendingWidgets: InsightWidget[],
  timestamp: string,
  traceToUse?: string
): AssistantChatMessage[] {
  const re = new RegExp(CHART_MARKER_RE);
  const segments: Array<{ text?: string; widgetIdx?: number }> = [];
  let lastIndex = 0;
  let widgetIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      segments.push({ text: textBefore });
    }
    segments.push({ widgetIdx: widgetIdx++ });
    lastIndex = re.lastIndex;
  }
  const textAfter = text.slice(lastIndex);
  if (textAfter.trim()) {
    segments.push({ text: textAfter });
  }

  const messages: AssistantChatMessage[] = [];
  segments.forEach((seg, i) => {
    const isLast = i === segments.length - 1;
    if (seg.text !== undefined) {
      messages.push({
        type: "assistant",
        message: seg.text,
        timestamp,
        ...(!isLast ? { suppressFooter: true } : {}),
        ...(isLast && traceToUse ? { traceId: traceToUse } : {}),
      });
    } else if (seg.widgetIdx !== undefined) {
      const widget = pendingWidgets[seg.widgetIdx];
      if (widget) {
        messages.push({
          type: "assistant",
          message: "",
          timestamp,
          widgets: [widget],
          ...(isLast && traceToUse ? { traceId: traceToUse } : {}),
        });
      }
    }
  });
  return messages;
}

// Fallback path: render each pending card first, then the narrative text so
// the text reads as a conclusion to the charts above it.
function buildFallbackMessages(
  text: string,
  pendingWidgets: InsightWidget[],
  timestamp: string,
  traceToUse?: string
): AssistantChatMessage[] {
  const messages: AssistantChatMessage[] = [];

  // Cards precede the narrative, so they are non-terminal: suppress their
  // footer and let the trace/footer live on the closing text message.
  pendingWidgets.forEach((widget) => {
    messages.push({
      type: "assistant",
      message: "",
      timestamp,
      widgets: [widget],
      suppressFooter: true,
    });
  });

  messages.push({
    type: "assistant",
    message: text,
    timestamp,
    ...(traceToUse ? { traceId: traceToUse } : {}),
  });

  return messages;
}
