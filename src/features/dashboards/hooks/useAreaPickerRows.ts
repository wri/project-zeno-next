import { useEffect, useMemo, useState } from "react";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import { useDashboards } from "./useDashboards";
import { useAoiBrowse } from "./useAoiBrowse";
import {
  aoiSearchResultToRow,
  buildPreviousAnalysesMap,
  customAreaToRow,
  filterRowsBySearch,
  type AreaPickerRow,
} from "../model/area-picker-rows";
import {
  REFERENCE_AOI_SOURCE_LABELS,
  REFERENCE_AOI_SOURCES,
  type AreaPickerSectionId,
  type ReferenceAoiSource,
} from "../model/dashboard-area";

const SEARCH_DEBOUNCE_MS = 250;

/** Delays propagating `value` changes so server queries fire per pause, not per keystroke. */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function isReferenceSourceEnabled(
  activeCategory: AreaPickerSectionId | "all",
  source: ReferenceAoiSource
): boolean {
  if (activeCategory === "custom") return false;
  if (activeCategory === "all") return true;
  return activeCategory === source;
}

export interface AreaPickerRowsResult {
  rows: AreaPickerRow[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Composes the existing per-source data hooks into the merged, filtered row
 * list the new-dashboard picker table renders. Underlying hooks are always
 * called (hooks can't be conditional), but AOI browse queries are disabled
 * when their source isn't relevant to `activeCategory`.
 *
 * Reference sources (gadm/kba/wdpa/landmark) are searched server-side via
 * `/api/aois?name=` — the catalog is far too large to filter client-side.
 * Custom areas are already fully loaded, so they're filtered locally with
 * the undebounced text for instant feedback.
 */
export function useAreaPickerRows(
  activeCategory: AreaPickerSectionId | "all",
  search: string
): AreaPickerRowsResult {
  const { customAreas, isLoading: customLoading } = useCustomAreasList();
  const { data: dashboards } = useDashboards();
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const gadm = useAoiBrowse("gadm", {
    enabled: isReferenceSourceEnabled(activeCategory, "gadm"),
    search: debouncedSearch,
  });
  const kba = useAoiBrowse("kba", {
    enabled: isReferenceSourceEnabled(activeCategory, "kba"),
    search: debouncedSearch,
  });
  const wdpa = useAoiBrowse("wdpa", {
    enabled: isReferenceSourceEnabled(activeCategory, "wdpa"),
    search: debouncedSearch,
  });
  const landmark = useAoiBrowse("landmark", {
    enabled: isReferenceSourceEnabled(activeCategory, "landmark"),
    search: debouncedSearch,
  });
  const referenceQueries = { gadm, kba, wdpa, landmark };

  const analysesMap = useMemo(
    () => buildPreviousAnalysesMap(dashboards ?? []),
    [dashboards]
  );

  const customRows = useMemo(
    () => (customAreas ?? []).map((area) => customAreaToRow(area, analysesMap)),
    [customAreas, analysesMap]
  );

  const referenceRows = useMemo(() => {
    const rowsBySource: Record<ReferenceAoiSource, AreaPickerRow[]> = {
      gadm: [],
      kba: [],
      wdpa: [],
      landmark: [],
    };
    for (const source of REFERENCE_AOI_SOURCES) {
      const results =
        referenceQueries[source].data?.pages.flatMap((p) => p.results) ?? [];
      rowsBySource[source] = results.map((result) =>
        aoiSearchResultToRow(
          result,
          REFERENCE_AOI_SOURCE_LABELS[source],
          analysesMap
        )
      );
    }
    return rowsBySource;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gadm.data, kba.data, wdpa.data, landmark.data, analysesMap]);

  if (activeCategory === "custom") {
    return {
      rows: filterRowsBySearch(customRows, search),
      isLoading: customLoading,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => {},
    };
  }

  if (activeCategory !== "all") {
    const query = referenceQueries[activeCategory];
    return {
      rows: referenceRows[activeCategory],
      isLoading: query.isLoading,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      fetchNextPage: () => {
        void query.fetchNextPage();
      },
    };
  }

  const merged = [
    ...REFERENCE_AOI_SOURCES.flatMap((source) => referenceRows[source]),
    ...filterRowsBySearch(customRows, search),
  ];

  return {
    rows: merged,
    isLoading:
      customLoading ||
      REFERENCE_AOI_SOURCES.some((s) => referenceQueries[s].isLoading),
    hasNextPage: REFERENCE_AOI_SOURCES.some(
      (s) => referenceQueries[s].hasNextPage
    ),
    isFetchingNextPage: REFERENCE_AOI_SOURCES.some(
      (s) => referenceQueries[s].isFetchingNextPage
    ),
    fetchNextPage: () => {
      for (const source of REFERENCE_AOI_SOURCES) {
        const query = referenceQueries[source];
        if (query.hasNextPage) void query.fetchNextPage();
      }
    },
  };
}
