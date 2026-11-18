import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { fetchAoiPage, type ReferenceAoiSource } from "@/src/entities/aoi";

const PAGE_SIZE = 100;

export function useAoiBrowse(
  source: ReferenceAoiSource | "custom",
  options?: { enabled?: boolean; name?: string }
) {
  // `name` is part of the query key so each search term is cached separately
  // and changing it triggers a fresh server-side fuzzy search.
  const name = options?.name?.trim() ?? "";
  return useInfiniteQuery({
    queryKey: ["aoiBrowse", source, name],
    queryFn: ({ pageParam, signal }) =>
      fetchAoiPage({
        sources: [source],
        name,
        limit: PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: options?.enabled ?? true,
    // Keep the prior results visible while a new search term loads.
    placeholderData: keepPreviousData,
  });
}
