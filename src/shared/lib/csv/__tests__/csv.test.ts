import { describe, expect, it } from "vitest";

import { rowsToCsv } from "../csv";

describe("rowsToCsv", () => {
  it("joins headers and rows with commas", () => {
    const csv = rowsToCsv([{ a: 1, b: "x" }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,x");
  });

  it("quotes cells containing a comma, quote, or newline", () => {
    const csv = rowsToCsv(
      [{ a: 'has "quote"', b: "a,b", c: "line1\nline2" }],
      ["a", "b", "c"]
    );
    expect(csv).toBe('a,b,c\n"has ""quote""","a,b","line1\nline2"');
  });

  it.each([
    ["=", "=SUM(A1:A9)"],
    ["+", "+1+1"],
    ["-", "-2+3+cmd|' /C calc'!A0"],
    ["@", "@SUM(1)"],
    ["a tab", "\t=1+1"],
    ["a carriage return", "\r=1+1"],
  ])("writes text that starts with %s as text, not a formula", (_, text) => {
    expect(rowsToCsv([{ a: text }], ["a"])).toBe(`a\n'${text}`);
  });

  it("quotes a formula-like cell after marking it as text", () => {
    const csv = rowsToCsv([{ a: '=HYPERLINK("x","y")' }], ["a"]);
    expect(csv).toBe('a\n"\'=HYPERLINK(""x"",""y"")"');
  });

  it("keeps numbers and text that is only a number as they are", () => {
    const csv = rowsToCsv([{ a: -12.5, b: "-12.5", c: "+3" }], ["a", "b", "c"]);
    expect(csv).toBe("a,b,c\n-12.5,-12.5,+3");
  });

  it("renders null/undefined cells as empty", () => {
    const csv = rowsToCsv([{ a: null, b: undefined }], ["a", "b"]);
    expect(csv).toBe("a,b\n,");
  });

  it("reads each header's value from a different row key when given rowKeys", () => {
    const csv = rowsToCsv([{ raw_key: 42 }], ["Renamed Header"], ["raw_key"]);
    expect(csv).toBe("Renamed Header\n42");
  });
});
