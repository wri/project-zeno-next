import { describe, expect, it } from "vitest";
import { signed } from "../number-format";

describe("signed", () => {
  it("rounds to two significant digits at every magnitude", () => {
    // A global or country-scale flux lands in the thousands of Mt …
    expect(signed.format(12345.6)).toBe("+12,000");
    expect(signed.format(1694.325)).toBe("+1,700");
    expect(signed.format(843.7)).toBe("+840");
    // … a state in the tens, a district under one.
    expect(signed.format(15.3)).toBe("+15");
    expect(signed.format(3.84)).toBe("+3.8");
    expect(signed.format(0.0123)).toBe("+0.012");
  });

  it("always prints the sign, including on zero and sub-integer sinks", () => {
    expect(signed.format(0)).toBe("+0");
    expect(signed.format(-843.7)).toBe("-840");
    // Under the old integer-only rounding this printed as "-0".
    expect(signed.format(-0.3)).toBe("-0.3");
  });
});
