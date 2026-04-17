import { describe, expect, it } from "vitest";
import { toSentenceCase } from "./formatText";

describe("toSentenceCase", () => {
  it("converts snake_case to sentence case", () => {
    expect(toSentenceCase("hello_world")).toBe("Hello World");
  });

  it("converts kebab-case to sentence case", () => {
    expect(toSentenceCase("tree-cover-loss")).toBe("Tree Cover Loss");
  });

  it("converts space-separated words", () => {
    expect(toSentenceCase("hello world")).toBe("Hello World");
  });

  it("handles already capitalized words", () => {
    expect(toSentenceCase("Hello World")).toBe("Hello World");
  });

  it("handles mixed separators", () => {
    expect(toSentenceCase("area_km2-value")).toBe("Area Km2 Value");
  });

  it("handles a single word", () => {
    expect(toSentenceCase("forest")).toBe("Forest");
  });

  it("handles an empty string", () => {
    expect(toSentenceCase("")).toBe("");
  });

  it("strips leading and trailing separators", () => {
    expect(toSentenceCase("_hello_")).toBe("Hello");
  });

  it("handles multiple consecutive separators", () => {
    expect(toSentenceCase("foo__bar")).toBe("Foo Bar");
  });
});
