import { describe, expect, it } from "vitest";

import { codeActParts, isCuratedInsight } from "../is-curated-insight";

const wellFormed = { type: "code_block", content: "cHJpbnQoKQ==" };

describe("isCuratedInsight", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty list", []],
    ["a non-array", "code"],
    ["an object", { type: "code_block", content: "x" }],
    ["a list of empty objects", [{}]],
    ["a part with a non-string type", [{ type: 1, content: "x" }]],
    ["a part with no content", [{ type: "code_block" }]],
    ["a list of nulls", [null]],
  ])("treats %s as curated", (_label, parts) => {
    expect(isCuratedInsight(parts)).toBe(true);
  });

  it("treats one well-formed provenance part as AI-generated", () => {
    expect(isCuratedInsight([wellFormed])).toBe(false);
  });

  it("treats a list with any well-formed part as AI-generated", () => {
    expect(isCuratedInsight([{}, null, wellFormed])).toBe(false);
  });
});

describe("codeActParts", () => {
  it("returns [] for non-array input", () => {
    expect(codeActParts(null)).toEqual([]);
    expect(codeActParts(undefined)).toEqual([]);
    expect(codeActParts("nope")).toEqual([]);
  });

  it("keeps only the well-formed parts, in order", () => {
    const other = { type: "execution_output", content: "b2s=" };
    expect(codeActParts([{}, wellFormed, null, other, { type: 2 }])).toEqual([
      wellFormed,
      other,
    ]);
  });
});
