import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";
import {
  DatasetCatalogResponseSchema,
  type DatasetCatalogResponse,
  type DatasetPalette,
} from "@/app/schemas/api/datasets/get";

async function fetchDatasetsCatalog(): Promise<DatasetCatalogResponse> {
  const res = await apiFetch("/api/datasets/catalog");

  if (!res.ok) {
    throw new Error(`Failed to fetch dataset catalog: ${res.statusText}`);
  }

  const data = await res.json();
  return DatasetCatalogResponseSchema.parse(data);
}

/**
 * The canonical color registry for dataset categories, series colors, and
 * divergent colors — backend-owned (see docs/insight-chart-colors-plan.md
 * in project-zeno) so charts and map legends are guaranteed to agree.
 *
 * Static, backend-deployment-scoped data: cached indefinitely for the
 * session, never refetched on window focus.
 */
export function useDatasetsCatalog() {
  const { data, isLoading, error } = useQuery<DatasetCatalogResponse>({
    queryKey: ["datasets-catalog"],
    queryFn: fetchDatasetsCatalog,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Keep a stable object reference across renders when `data` hasn't
  // changed — this is consumed as a useEffect dependency in useLegendHook,
  // and a freshly-built object every render there causes an infinite
  // render loop (the effect never sees a stable dependency).
  const palettesByDatasetId = useMemo(() => {
    const map: Record<number, DatasetPalette> = {};
    for (const palette of data?.datasets ?? []) {
      map[palette.dataset_id] = palette;
    }
    return map;
  }, [data]);

  return { palettesByDatasetId, isLoading, error };
}
