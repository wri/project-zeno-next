import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { AOI_SEARCH_MIN_CHARS } from "../model/aoi-search";
import { fetchAoiPage } from "./fetch-aoi-page";

const PAGE_SIZE = 20;

/**
 * A ranked, paged name search across `sources` — one request for all of
 * them, so the backend's best match comes first whichever set it's from.
 * Idle until `name` reaches `AOI_SEARCH_MIN_CHARS`; pass it debounced.
 */
export function useAoiSearch(name: string, sources: readonly string[]) {
  const term = name.trim();
  return useInfiniteQuery({
    queryKey: ["aoiSearch", [...sources].sort(), term],
    queryFn: ({ pageParam, signal }) =>
      fetchAoiPage({
        name: term,
        sources,
        limit: PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: term.length >= AOI_SEARCH_MIN_CHARS,
    // Keep the prior results visible while a new term loads.
    placeholderData: keepPreviousData,
  });
}
