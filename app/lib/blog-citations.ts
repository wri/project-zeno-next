/**
 * Helpers for WRI Insights blog citations in assistant replies.
 *
 * The agent cites WRI Insights articles with compact numbered markdown
 * links, e.g. `[1](https://www.wri.org/insights/some-article)`. The
 * frontend swaps each marker for a citation chip that shows the article
 * card on hover (metadata from GET /api/blogs/metadata).
 */

const WRI_INSIGHTS_URL_RE =
  /^https?:\/\/(?:www\.)?wri\.org\/insights\/[^/?#\s]+(?:[?#]\S*)?$/;

const CITATION_LABEL_RE = /^\d{1,3}$/;

const CITATION_LINK_RE =
  /\[(\d{1,3})\]\((https?:\/\/(?:www\.)?wri\.org\/insights\/[^)\s]+)\)/g;

/** True when a markdown link is a numbered WRI Insights citation marker. */
export function isBlogCitation(href: string, label: string): boolean {
  return CITATION_LABEL_RE.test(label.trim()) && WRI_INSIGHTS_URL_RE.test(href);
}

/** Unique WRI Insights URLs cited (as `[N](url)`) in a markdown string. */
export function extractCitationUrls(markdown: string): string[] {
  const urls = new Set<string>();
  for (const match of markdown.matchAll(CITATION_LINK_RE)) {
    urls.add(match[2]);
  }
  return [...urls];
}
