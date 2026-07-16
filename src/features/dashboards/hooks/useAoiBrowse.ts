import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { browseAois } from "../api/aois";
import type { ReferenceAoiSource } from "../model/dashboard-area";

const PAGE_SIZE = 50;

export function useAoiBrowse(
  source: ReferenceAoiSource | "custom",
  options?: { enabled?: boolean; name?: string }
) {
  // `name` is part of the query key so each search term is cached separately
  // and changing it triggers a fresh server-side fuzzy search.
  const name = options?.name?.trim() ?? "";
  return useInfiniteQuery({
    queryKey: ["aoiBrowse", source, name],
    queryFn: ({ pageParam = 0 }) =>
      browseAois({ source, name, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: options?.enabled ?? true,
    // Keep the prior results visible while a new search term loads.
    placeholderData: keepPreviousData,
  });
}
