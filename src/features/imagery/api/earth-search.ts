import type { StacItem } from "../model/scenes";

export const EARTH_SEARCH_URL = "https://earth-search.aws.element84.com/v1";

interface SearchPage {
  features?: StacItem[];
  links?: { rel: string; body?: Record<string, unknown> }[];
}

/**
 * POST /search on earth-search, following `next` links until `maxItems`
 * items are in. earth-search allows any origin (CORS `*`), so the browser
 * calls it directly.
 */
export async function searchStac(
  body: Record<string, unknown>,
  maxItems: number,
  signal?: AbortSignal
): Promise<StacItem[]> {
  const items: StacItem[] = [];
  let pageBody: Record<string, unknown> | undefined = body;
  while (pageBody && items.length < maxItems) {
    const response: Response = await fetch(`${EARTH_SEARCH_URL}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pageBody),
      signal,
    });
    if (!response.ok) {
      throw new Error(`STAC search failed: HTTP ${response.status}`);
    }
    const page: SearchPage = await response.json();
    items.push(...(page.features ?? []));
    const next = page.links?.find((link) => link.rel === "next");
    // earth-search pages with a POST `next` link whose body holds the token.
    pageBody = next?.body ? { ...pageBody, ...next.body } : undefined;
  }
  return items.slice(0, maxItems);
}
