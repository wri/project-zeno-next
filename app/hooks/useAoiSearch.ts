import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiFetch } from "@/app/lib/api-client";
import {
  AoiSearchResponseSchema,
  type AoiSearchResult,
} from "@/app/schemas/api/aois/get";

export const AOI_SEARCH_LIMIT = 50;

/**
 * Query string for GET /api/aois. The `source` filter is a repeatable param
 * (`source=gadm&source=kba`), not a comma-joined list.
 */
export function buildAoiSearchParams(
  name: string,
  sources: string[],
  limit: number = AOI_SEARCH_LIMIT
): URLSearchParams {
  const params = new URLSearchParams();
  const trimmed = name.trim();
  if (trimmed) params.set("name", trimmed);
  for (const source of sources) params.append("source", source);
  params.set("limit", String(limit));
  return params;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Debounced area search. An empty `name` browses areas alphabetically within
 * the selected sources (the endpoint supports browse mode), so the create
 * table is never empty on first paint.
 */
export function useAoiSearch(name: string, sources: string[]) {
  const debouncedName = useDebouncedValue(name, 300);

  const { data, isLoading, isPlaceholderData, error } = useQuery<
    AoiSearchResult[]
  >({
    queryKey: ["aoiSearch", debouncedName.trim(), [...sources].sort()],
    queryFn: async () => {
      const params = buildAoiSearchParams(debouncedName, sources);
      const res = await apiFetch(`/api/aois?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Area search failed: ${res.statusText}`);
      }
      return AoiSearchResponseSchema.parse(await res.json());
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return {
    results: data,
    // Searching covers both the initial load and showing stale results while
    // the debounced refetch is in flight.
    isSearching: isLoading || isPlaceholderData,
    error,
  };
}
