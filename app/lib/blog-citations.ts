/**
 * Helpers for Insights blog citations in assistant replies.
 *
 * The agent cites articles with compact numbered markdown links, e.g.
 * `[1](https://www.wri.org/insights/some-article)` or
 * `[2](https://landcarbonlab.org/insights/other-article)`. The frontend
 * swaps each marker for a citation chip that shows the article card on hover
 * (metadata from `cited_articles` agent state updates).
 */

import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import { normalizeCitedArticles } from "@/app/schemas/api/blogs/get";

const INSIGHTS_HOSTS = "(?:www\\.)?(?:wri\\.org|landcarbonlab\\.org)";

const INSIGHTS_URL_RE = new RegExp(
  `^https?:\\/\\/${INSIGHTS_HOSTS}\\/insights\\/[^/?#\\s]+\\/?(?:[?#]\\S*)?$`
);

const INSIGHTS_SLUG_RE = new RegExp(
  `^https?:\\/\\/${INSIGHTS_HOSTS}\\/insights\\/([^/?#\\s]+)\\/?`
);

const CITATION_LABEL_RE = /^\d{1,3}$/;

const CITATION_LINK_RE = new RegExp(
  `\\[(\\d{1,3})\\]\\((https?:\\/\\/${INSIGHTS_HOSTS}\\/insights\\/[^)\\s]+)\\)`,
  "g"
);

function normalizeCitationUrl(url: string): string {
  return url.split("#", 1)[0].split("?", 1)[0].replace(/\/$/, "");
}

/** True when a markdown link is a numbered Insights citation marker. */
export function isBlogCitation(href: string, label: string): boolean {
  return CITATION_LABEL_RE.test(label.trim()) && INSIGHTS_URL_RE.test(href);
}

/** Unique Insights URLs cited (as `[N](url)`) in a markdown string. */
export function extractCitationUrls(markdown: string): string[] {
  const urls = new Set<string>();
  for (const match of markdown.matchAll(CITATION_LINK_RE)) {
    urls.add(match[2]);
  }
  return [...urls];
}

/** Extract the article slug from an Insights URL, if present. */
export function extractInsightsSlug(href: string): string | null {
  const match = href.match(INSIGHTS_SLUG_RE);
  return match ? match[1].replace(/\/$/, "") : null;
}

/** Merge cited articles into a slug-keyed map. */
export function mergeCitedArticlesIntoMap(
  existing: Record<string, BlogArticle>,
  articles: unknown[]
): Record<string, BlogArticle> {
  const normalized = normalizeCitedArticles(articles);
  if (normalized.length === 0) return existing;
  const next = { ...existing };
  for (const article of normalized) {
    next[article.slug] = article;
  }
  return next;
}

/** Cited articles for a message, in first-appearance order. */
export function getCitedArticlesInOrder(
  markdown: string,
  articlesBySlug: Record<string, BlogArticle>
): BlogArticle[] {
  const result: BlogArticle[] = [];
  const seen = new Set<string>();
  for (const url of extractCitationUrls(markdown)) {
    const article = resolveCitedArticle(url, articlesBySlug);
    if (article && !seen.has(article.slug)) {
      seen.add(article.slug);
      result.push(article);
    }
  }
  return result;
}

/** Resolve card metadata for a citation URL from the thread-level map. */
export function resolveCitedArticle(
  href: string,
  articlesBySlug: Record<string, BlogArticle>
): BlogArticle | undefined {
  const normalizedHref = normalizeCitationUrl(href);
  for (const article of Object.values(articlesBySlug)) {
    if (normalizeCitationUrl(article.url) === normalizedHref) return article;
  }
  const slug = extractInsightsSlug(href);
  if (slug) return articlesBySlug[slug];
  return undefined;
}
