/**
 * Helpers for WRI Insights blog citations in assistant replies.
 *
 * The agent cites WRI Insights articles with compact numbered markdown
 * links, e.g. `[1](https://www.wri.org/insights/some-article)`. The
 * frontend swaps each marker for a citation chip that shows the article
 * card on hover (metadata from `cited_articles` agent state updates).
 */

import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import { normalizeCitedArticles } from "@/app/schemas/api/blogs/get";

const WRI_INSIGHTS_URL_RE =
  /^https?:\/\/(?:www\.)?wri\.org\/insights\/[^/?#\s]+(?:[?#]\S*)?$/;

const INSIGHTS_SLUG_RE =
  /^https?:\/\/(?:www\.)?wri\.org\/insights\/([^/?#\s]+)/;

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

/** Extract the article slug from a WRI Insights URL, if present. */
export function extractInsightsSlug(href: string): string | null {
  const match = href.match(INSIGHTS_SLUG_RE);
  return match ? match[1] : null;
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
  for (const article of Object.values(articlesBySlug)) {
    if (article.url === href) return article;
  }
  const slug = extractInsightsSlug(href);
  if (slug) return articlesBySlug[slug];
  return undefined;
}
