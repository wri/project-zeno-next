import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { browseAois } from "../api/aois";
import type { ReferenceAoiSource } from "../model/dashboard-area";

const PAGE_SIZE = 50;

export function useAoiBrowse(
  source: ReferenceAoiSource | "custom",
  options?: { enabled?: boolean; search?: string }
) {
  const search = options?.search?.trim() ?? "";

  return useInfiniteQuery({
    queryKey: ["aoiBrowse", source, search],
    queryFn: ({ pageParam = 0 }) =>
      browseAois({
        source,
        name: search || undefined,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: options?.enabled ?? true,
    // Show the previous result set while a new search term fetches, so the
    // table doesn't flash to skeletons on every keystroke.
    placeholderData: keepPreviousData,
  });
}
