import { describe, it, expect } from "vitest";
import { formatCanopyThreshold } from "../formatCanopyThreshold";

describe("formatCanopyThreshold", () => {
  it("formats a numeric threshold as a > percentage", () => {
    expect(formatCanopyThreshold(30)).toBe("> 30%");
  });

  it("accepts a string threshold", () => {
    expect(formatCanopyThreshold("75")).toBe("> 75%");
  });
});
