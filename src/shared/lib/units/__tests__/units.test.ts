import { describe, expect, it } from "vitest";
import { mgToMt } from "../units";

describe("mgToMt", () => {
  it("divides by one million", () => {
    expect(mgToMt(1_000_000)).toBe(1);
    expect(mgToMt(850_000_000)).toBe(850);
  });

  it("preserves sign and zero", () => {
    expect(mgToMt(-750_000_000)).toBe(-750);
    expect(mgToMt(0)).toBe(0);
  });
});
