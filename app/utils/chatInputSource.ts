import type { ChatPrompt, SendSource } from "@/app/types/chat";

/**
 * Serialises a caller's SendSource into the chat request body fields. This is
 * the one place `query_type` is derived: nudges keep the legacy "human_input"
 * marker for BE builds that predate `input_source`, everything else is "query".
 */
export function toChatRequestSource(
  source: SendSource
): Pick<ChatPrompt, "input_source" | "nudge_response" | "query_type"> {
  if (source.inputSource === "nudge") {
    return {
      input_source: "nudge",
      nudge_response: {
        type: source.nudgeResponse.type,
        option_index: source.nudgeResponse.option_index,
      },
      query_type: "human_input",
    };
  }
  return { input_source: source.inputSource, query_type: "query" };
}
