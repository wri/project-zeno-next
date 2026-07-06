/**
 * AgentState message parsing for the Trace Explorer
 * (port of the helpers in tracey's tabs/trace_explorer.py).
 */

import type { AgentMessage } from "../model/types";

export function asDict(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Extract readable text from a message content value (string or parts list). */
export function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (typeof item === "string") {
        parts.push(item);
        continue;
      }
      const dict = asDict(item);
      if (typeof dict.text === "string" && dict.text.trim()) {
        parts.push(dict.text);
      } else if (typeof dict.content === "string" && dict.content.trim()) {
        parts.push(dict.content);
      }
    }
    return parts.join("\n");
  }
  const dict = asDict(content);
  if (typeof dict.text === "string") return dict.text;
  if (typeof dict.content === "string") return dict.content;
  return "";
}

/** Normalized message type: "human" | "ai" | "tool" | … */
export function messageType(message: AgentMessage): string {
  const raw = String(message.type ?? message.role ?? "").toLowerCase();
  if (raw === "assistant") return "ai";
  if (raw === "user") return "human";
  return raw;
}

function stopReason(message: AgentMessage): string {
  const meta = asDict(message.response_metadata);
  const reason =
    meta.stop_reason ??
    meta.finish_reason ??
    message.stop_reason ??
    message.finish_reason ??
    "";
  return String(reason).toLowerCase();
}

const NON_MEANINGFUL_PREFIXES = [
  "user selected",
  "user clicked",
  "user chose",
  "user set",
  "user changed",
  "user uploaded",
  "user drew",
  "user toggled",
  "selected aoi",
  "selected dataset",
  "user selected aoi",
];

/** True for human messages that are real prompts (not UI-event notifications). */
export function isMeaningfulHuman(text: string): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.trim().toLowerCase();
  if (NON_MEANINGFUL_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return false;
  }
  return /[\p{L}\p{N}]/u.test(text);
}

export interface TurnWindow {
  readonly start: number | null;
  readonly end: number | null;
}

/**
 * Locate the active (last) turn inside output.messages: the last AI message
 * that ends a turn, and the meaningful human prompt that started it.
 */
export function findActiveTurnWindow(
  messages: readonly AgentMessage[]
): TurnWindow {
  if (!messages.length) return { start: null, end: null };

  const endIdxs: number[] = [];
  messages.forEach((message, i) => {
    if (messageType(message) !== "ai") return;
    const reason = stopReason(message);
    if (reason === "end_turn") {
      endIdxs.push(i);
      return;
    }
    if (reason === "stop") {
      const next = messages[i + 1];
      if (!next || messageType(next) === "human") endIdxs.push(i);
    }
  });

  if (!endIdxs.length) {
    for (let j = messages.length - 1; j >= 0; j -= 1) {
      if (
        messageType(messages[j]) === "human" &&
        isMeaningfulHuman(contentText(messages[j].content))
      ) {
        return { start: j, end: null };
      }
    }
    return { start: null, end: null };
  }

  const end = endIdxs[endIdxs.length - 1];
  const prevEnd = endIdxs.length > 1 ? endIdxs[endIdxs.length - 2] : -1;

  let start: number | null = null;
  for (let j = end - 1; j > prevEnd; j -= 1) {
    if (
      messageType(messages[j]) === "human" &&
      isMeaningfulHuman(contentText(messages[j].content))
    ) {
      start = j;
      break;
    }
  }
  if (start === null) {
    start = prevEnd + 1 <= end ? prevEnd + 1 : null;
  }
  return { start, end };
}

/** The latest human prompt in input.messages. */
export function currentUserPrompt(
  inputMessages: readonly AgentMessage[]
): string {
  for (let i = inputMessages.length - 1; i >= 0; i -= 1) {
    const message = inputMessages[i];
    if (messageType(message) !== "human") continue;
    const text = contentText(message.content).trim();
    if (text) return text;
  }
  return "";
}

/** Remove noisy vendor keys from a nested payload for the cleaned JSON view. */
export function stripNoise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNoise);
  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (key === "__gemini_function_call_thought_signatures__") continue;
      cleaned[key] = stripNoise(inner);
    }
    return cleaned;
  }
  return value;
}

export interface ToolCallView {
  readonly index: number;
  readonly callId: string;
  readonly name: string;
  readonly args: unknown;
  readonly resultStatus: string;
  readonly resultText: string;
  readonly result: Record<string, unknown> | null;
}

/** Pair AI tool calls in [from, to) with their tool-result messages. */
export function extractToolCalls(
  messages: readonly AgentMessage[],
  from: number,
  to: number
): ToolCallView[] {
  const resultsByCallId = new Map<string, Record<string, unknown>>();
  for (const message of messages) {
    if (messageType(message) === "tool" && message.tool_call_id != null) {
      resultsByCallId.set(String(message.tool_call_id), asDict(message));
    }
  }

  const calls: ToolCallView[] = [];
  for (let i = Math.max(0, from); i < Math.min(messages.length, to); i += 1) {
    const message = messages[i];
    if (messageType(message) !== "ai") continue;
    for (const rawCall of asList(message.tool_calls)) {
      const call = asDict(rawCall);
      const callId = String(call.id ?? "");
      const result = resultsByCallId.get(callId) ?? null;
      calls.push({
        index: calls.length + 1,
        callId,
        name: String(call.name ?? ""),
        args: call.args,
        resultStatus: result ? String(result.status ?? "") : "",
        resultText: result ? contentText(result.content) : "",
        result,
      });
    }
  }
  return calls;
}
