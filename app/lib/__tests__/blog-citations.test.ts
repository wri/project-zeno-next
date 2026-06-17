import { describe, it, expect } from "vitest";
import {
  extractCitationUrls,
  extractInsightsSlug,
  getCitedArticlesInOrder,
  isBlogCitation,
  mergeCitedArticlesIntoMap,
  resolveCitedArticle,
} from "../blog-citations";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";

const URL_A = "https://www.wri.org/insights/amazon-fires-explained";
const URL_B = "https://www.wri.org/insights/forest-monitoring-tools";

const ARTICLE_A: BlogArticle = {
  slug: "amazon-fires-explained",
  title: "Amazon Fires Explained",
  abstract: "An overview of Amazon fires.",
  url: URL_A,
  lastmod: "2026-01-01T00:00:00Z",
  image: "",
  image_alt: "",
};

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

describe("extractInsightsSlug", () => {
  it("extracts slug from canonical and variant URLs", () => {
    expect(extractInsightsSlug(URL_A)).toBe("amazon-fires-explained");
    expect(extractInsightsSlug(`${URL_A}#p12`)).toBe("amazon-fires-explained");
    expect(extractInsightsSlug(`${URL_A}?utm_source=x`)).toBe(
      "amazon-fires-explained"
    );
  });

  it("returns null for non-insights URLs", () => {
    expect(extractInsightsSlug("https://example.com/insights/foo")).toBeNull();
  });
});

describe("resolveCitedArticle", () => {
  const articlesBySlug = { [ARTICLE_A.slug]: ARTICLE_A };

  it("resolves by canonical URL", () => {
    expect(resolveCitedArticle(URL_A, articlesBySlug)).toEqual(ARTICLE_A);
  });

  it("resolves by slug when the marker URL has a fragment or query", () => {
    expect(resolveCitedArticle(`${URL_A}#p12`, articlesBySlug)).toEqual(
      ARTICLE_A
    );
    expect(
      resolveCitedArticle(`${URL_A}?utm_source=x`, articlesBySlug)
    ).toEqual(ARTICLE_A);
  });

  it("returns undefined for unknown slugs", () => {
    expect(resolveCitedArticle(URL_B, articlesBySlug)).toBeUndefined();
  });
});

describe("mergeCitedArticlesIntoMap", () => {
  it("merges articles keyed by slug without dropping existing entries", () => {
    const articleB: BlogArticle = {
      ...ARTICLE_A,
      slug: "forest-monitoring-tools",
      title: "Forest Monitoring Tools",
      url: URL_B,
    };
    const merged = mergeCitedArticlesIntoMap({ [ARTICLE_A.slug]: ARTICLE_A }, [
      articleB,
    ]);
    expect(merged).toEqual({
      [ARTICLE_A.slug]: ARTICLE_A,
      [articleB.slug]: articleB,
    });
  });

  it("accepts summary as an alias for abstract", () => {
    const merged = mergeCitedArticlesIntoMap({}, [
      {
        slug: "amazon-fires-explained",
        title: "Amazon Fires",
        summary: "A summary from stream state.",
        url: URL_A,
        lastmod: "2026-01-01T00:00:00Z",
        image: "https://files.wri.org/hero.jpg",
      },
    ]);
    expect(merged["amazon-fires-explained"].abstract).toBe(
      "A summary from stream state."
    );
  });
});

describe("getCitedArticlesInOrder", () => {
  const articlesBySlug = {
    [ARTICLE_A.slug]: ARTICLE_A,
    "forest-monitoring-tools": {
      ...ARTICLE_A,
      slug: "forest-monitoring-tools",
      title: "Forest Monitoring Tools",
      url: URL_B,
    },
  };

  it("returns cited articles in marker order with metadata", () => {
    const markdown = `First [2](${URL_B}) then [1](${URL_A}).`;
    expect(getCitedArticlesInOrder(markdown, articlesBySlug)).toEqual([
      articlesBySlug["forest-monitoring-tools"],
      ARTICLE_A,
    ]);
  });
});
