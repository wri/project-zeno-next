import { describe, expect, it } from "vitest";
import { toChatRequestSource } from "../chatInputSource";
import type { InputSource } from "@/app/types/chat";

describe("toChatRequestSource", () => {
  it("maps a nudge click to human_input with its nudge_response", () => {
    expect(
      toChatRequestSource({
        inputSource: "nudge",
        nudgeResponse: { type: "dataset_choice", option_index: 2 },
      })
    ).toEqual({
      input_source: "nudge",
      nudge_response: { type: "dataset_choice", option_index: 2 },
      query_type: "human_input",
    });
  });

  it.each(["", "confirm"])(
    "passes the nudge type %j through untouched",
    (type) => {
      expect(
        toChatRequestSource({
          inputSource: "nudge",
          nudgeResponse: { type, option_index: 0 },
        }).nudge_response
      ).toEqual({ type, option_index: 0 });
    }
  );

  const nonNudge: Exclude<InputSource, "nudge">[] = [
    "typed",
    "starter_prompt",
    "dashboard_chip",
    "dashboard_module",
    "analyse_nudge",
    "url_prompt",
    "map_action",
  ];

  it.each(nonNudge)("maps %s to query with no nudge_response", (source) => {
    const fields = toChatRequestSource({ inputSource: source });
    expect(fields).toEqual({ input_source: source, query_type: "query" });
    expect(fields).not.toHaveProperty("nudge_response");
  });
});
