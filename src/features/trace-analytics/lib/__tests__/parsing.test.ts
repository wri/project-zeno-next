import { describe, expect, it } from "vitest";
import {
  contentText,
  currentUserPrompt,
  extractToolCalls,
  findActiveTurnWindow,
  isMeaningfulHuman,
  messageType,
  stripNoise,
} from "../parsing";

describe("contentText", () => {
  it("handles strings, part lists and dicts", () => {
    expect(contentText("hello")).toBe("hello");
    expect(contentText([{ text: "a" }, { content: "b" }, { other: 1 }])).toBe(
      "a\nb"
    );
    expect(contentText({ text: "x" })).toBe("x");
    expect(contentText(null)).toBe("");
  });
});

describe("messageType", () => {
  it("normalizes assistant/user aliases", () => {
    expect(messageType({ type: "assistant" })).toBe("ai");
    expect(messageType({ role: "user" })).toBe("human");
    expect(messageType({ type: "tool" })).toBe("tool");
  });
});

describe("isMeaningfulHuman", () => {
  it("rejects UI-event notifications and empty text", () => {
    expect(isMeaningfulHuman("User selected AOI: Brazil")).toBe(false);
    expect(isMeaningfulHuman("   ")).toBe(false);
    expect(isMeaningfulHuman("How much forest was lost?")).toBe(true);
  });
});

describe("findActiveTurnWindow", () => {
  it("finds the last end_turn and its opening human prompt", () => {
    const messages = [
      { type: "human", content: "first question" },
      {
        type: "ai",
        content: "answer 1",
        response_metadata: { stop_reason: "end_turn" },
      },
      { type: "human", content: "second question" },
      {
        type: "ai",
        content: "answer 2",
        response_metadata: { stop_reason: "end_turn" },
      },
    ];
    expect(findActiveTurnWindow(messages)).toEqual({ start: 2, end: 3 });
  });

  it("falls back to the last meaningful human when no turn end exists", () => {
    const messages = [
      { type: "human", content: "User selected AOI: Brazil" },
      { type: "human", content: "real question" },
      { type: "ai", content: "" },
    ];
    expect(findActiveTurnWindow(messages)).toEqual({ start: 1, end: null });
  });

  it("returns nulls for empty input", () => {
    expect(findActiveTurnWindow([])).toEqual({ start: null, end: null });
  });
});

describe("currentUserPrompt", () => {
  it("returns the latest non-empty human prompt", () => {
    const messages = [
      { type: "human", content: "first" },
      { type: "ai", content: "answer" },
      { type: "human", content: "latest" },
    ];
    expect(currentUserPrompt(messages)).toBe("latest");
  });
});

describe("extractToolCalls", () => {
  it("pairs tool calls with results by tool_call_id", () => {
    const messages = [
      {
        type: "ai",
        content: "",
        tool_calls: [{ id: "call-1", name: "pull_data", args: { x: 1 } }],
      },
      {
        type: "tool",
        tool_call_id: "call-1",
        status: "success",
        content: "done",
      },
    ];
    const calls = extractToolCalls(messages, 0, messages.length);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("pull_data");
    expect(calls[0].resultStatus).toBe("success");
    expect(calls[0].resultText).toBe("done");
  });
});

describe("stripNoise", () => {
  it("removes the Gemini thought-signature key recursively", () => {
    const input = {
      keep: 1,
      __gemini_function_call_thought_signatures__: "zzz",
      nested: [
        { __gemini_function_call_thought_signatures__: "zzz", ok: true },
      ],
    };
    expect(stripNoise(input)).toEqual({ keep: 1, nested: [{ ok: true }] });
  });
});
