import { useInfiniteQuery } from "@tanstack/react-query";
import { browseAois } from "../api/aois";
import type { ReferenceAoiSource } from "../model/dashboard-area";

const PAGE_SIZE = 50;

export function useAoiBrowse(source: ReferenceAoiSource | "custom") {
  return useInfiniteQuery({
    queryKey: ["aoiBrowse", source],
    queryFn: ({ pageParam = 0 }) =>
      browseAois({ source, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}
