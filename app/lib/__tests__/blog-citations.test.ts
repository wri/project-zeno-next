import { describe, it, expect } from "vitest";
import { extractCitationUrls, isBlogCitation } from "../blog-citations";

const URL_A = "https://www.wri.org/insights/amazon-fires-explained";
const URL_B = "https://www.wri.org/insights/forest-monitoring-tools";

describe("isBlogCitation", () => {
  it("accepts numbered links to wri.org/insights articles", () => {
    expect(isBlogCitation(URL_A, "1")).toBe(true);
    expect(isBlogCitation(URL_B, "12")).toBe(true);
    expect(isBlogCitation("http://wri.org/insights/some-article", "3")).toBe(
      true
    );
  });

  it("accepts URLs with query strings or fragments", () => {
    expect(isBlogCitation(`${URL_A}?utm_source=x`, "1")).toBe(true);
    expect(isBlogCitation(`${URL_A}#p12`, "1")).toBe(true);
  });

  it("rejects non-numeric labels", () => {
    expect(isBlogCitation(URL_A, "see article")).toBe(false);
    expect(isBlogCitation(URL_A, "")).toBe(false);
    expect(isBlogCitation(URL_A, "1a")).toBe(false);
  });

  it("rejects URLs outside wri.org/insights", () => {
    expect(isBlogCitation("https://www.wri.org/data/some-page", "1")).toBe(
      false
    );
    expect(isBlogCitation("https://example.com/insights/foo", "1")).toBe(false);
    expect(isBlogCitation("https://www.wri.org/insights/foo/nested", "1")).toBe(
      false
    );
  });
});

describe("extractCitationUrls", () => {
  it("extracts unique citation URLs from markdown", () => {
    const markdown = [
      `Forest loss accelerated after 2020 [1](${URL_A}).`,
      `Monitoring tools improved response times [2](${URL_B}),`,
      `which echoes earlier findings [1](${URL_A}).`,
    ].join(" ");
    expect(extractCitationUrls(markdown)).toEqual([URL_A, URL_B]);
  });

  it("ignores regular links and non-citation markers", () => {
    const markdown = [
      `See [the full report](${URL_A}) for details.`,
      "Visit [1](https://example.com/page) elsewhere.",
      "Plain [1] brackets are untouched.",
    ].join(" ");
    expect(extractCitationUrls(markdown)).toEqual([]);
  });

  it("returns an empty array for markdown without citations", () => {
    expect(extractCitationUrls("No citations here.")).toEqual([]);
  });
});
