import { describe, it, expect } from "vitest";

import {
  bulletApply,
  headingApply,
  numberApply,
  prefixLines,
  wrapSelection,
} from "../markdown-toolbar";

describe("wrapSelection", () => {
  it("wraps the selection and keeps it selected inside the markers", () => {
    const r = wrapSelection("make bold here", 5, 9, "**", "**", "text");
    expect(r.value).toBe("make **bold** here");
    // selection now spans "bold", just inside the leading `**`
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe("bold");
  });

  it("inserts and selects the placeholder when there is no selection", () => {
    const r = wrapSelection("", 0, 0, "**", "**", "bold text");
    expect(r.value).toBe("**bold text**");
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe("bold text");
  });

  it("builds a link with the url portion outside the selection", () => {
    const r = wrapSelection("see docs", 4, 8, "[", "](url)", "link text");
    expect(r.value).toBe("see [docs](url)");
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe("docs");
  });
});

describe("prefixLines + apply helpers", () => {
  it("prefixes a heading from a mid-line caret", () => {
    const r = prefixLines("Key Insights", 3, 3, headingApply(2));
    expect(r.value).toBe("## Key Insights");
  });

  it("replaces an existing heading rather than stacking markers", () => {
    const r = prefixLines("# Title", 0, 7, headingApply(3));
    expect(r.value).toBe("### Title");
  });

  it("bullets every line touched by a multi-line selection", () => {
    const value = "one\ntwo\nthree";
    const r = prefixLines(value, 0, value.length, bulletApply());
    expect(r.value).toBe("- one\n- two\n- three");
    // whole rewritten block is selected
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe(r.value);
  });

  it("numbers lines sequentially and rewrites existing bullets", () => {
    const value = "- one\n- two";
    const r = prefixLines(value, 0, value.length, numberApply());
    expect(r.value).toBe("1. one\n2. two");
  });

  it("only transforms lines within the selection", () => {
    const value = "keep\ntarget\nkeep";
    const start = value.indexOf("target");
    const r = prefixLines(value, start, start, bulletApply());
    expect(r.value).toBe("keep\n- target\nkeep");
  });
});
