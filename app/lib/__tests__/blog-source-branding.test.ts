import { describe, it, expect } from "vitest";
import { blogSourceBranding, inferBlogSource } from "../blog-source-branding";

describe("inferBlogSource", () => {
  it("honours an explicit source over the URL", () => {
    expect(inferBlogSource("https://example.com/x", "lcl")).toBe("lcl");
    expect(inferBlogSource("https://example.com/x", "wri")).toBe("wri");
  });

  it("detects LCL and WRI from the URL host", () => {
    expect(
      inferBlogSource("https://landcarbonlab.org/insights/carbon-monitoring")
    ).toBe("lcl");
    expect(inferBlogSource("https://www.wri.org/insights/amazon-fires")).toBe(
      "wri"
    );
  });

  it("falls back to 'other' for unrecognised sources", () => {
    expect(inferBlogSource("https://example.com/insights/foo")).toBe("other");
    expect(inferBlogSource("")).toBe("other");
    // An unknown explicit source string is not honoured — the URL wins, then
    // the neutral fallback.
    expect(inferBlogSource("https://example.com/x", "nasa")).toBe("other");
  });
});

describe("blogSourceBranding", () => {
  it("uses the blue primary palette for LCL", () => {
    const lcl = blogSourceBranding("lcl");
    expect(lcl.pillBg).toBe("#D7DFF2");
    expect(lcl.pillBorder).toBe("#7898D7");
    expect(lcl.pillText).toBe("#0E1E3C");
    expect(lcl.useLclLogo).toBe(true);
  });

  it("provides a neutral treatment for 'other'", () => {
    const other = blogSourceBranding("other");
    expect(other.label).toBe("Other source");
    expect(other.useLclLogo).toBe(false);
    expect(other.pillBg).toBe("#F4F5F7");
  });
});
