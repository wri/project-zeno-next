import { useMemo } from "react";
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
  /**
   * A server-side search is in flight and `rows` are stale placeholder data
   * kept from the previous term (`keepPreviousData`). `isLoading` stays false
   * in that window, so consumers need this flag to show search feedback.
   */
  isSearching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

interface ReferenceQueryState {
  isFetching: boolean;
  isPlaceholderData: boolean;
}

function isSearchInFlight(query: ReferenceQueryState): boolean {
  return query.isFetching && query.isPlaceholderData;
}

/**
 * Composes the existing per-source data hooks into the merged, filtered row
 * list the new-dashboard picker table renders. Underlying hooks are always
 * called (hooks can't be conditional), but AOI browse queries are disabled
 * when their source isn't relevant to `activeCategory`.
 */
export function useAreaPickerRows(
  activeCategory: AreaPickerSectionId | "all",
  search: string
): AreaPickerRowsResult {
  const { customAreas, isLoading: customLoading } = useCustomAreasList();
  const { data: dashboards } = useDashboards();

  // Reference sources are searched server-side (fuzzy, similarity-ranked) by
  // threading `search` through to the /api/aois endpoint. Custom areas are all
  // loaded locally and filtered client-side below.
  const gadm = useAoiBrowse("gadm", {
    enabled: isReferenceSourceEnabled(activeCategory, "gadm"),
    name: search,
  });
  const kba = useAoiBrowse("kba", {
    enabled: isReferenceSourceEnabled(activeCategory, "kba"),
    name: search,
  });
  const wdpa = useAoiBrowse("wdpa", {
    enabled: isReferenceSourceEnabled(activeCategory, "wdpa"),
    name: search,
  });
  const landmark = useAoiBrowse("landmark", {
    enabled: isReferenceSourceEnabled(activeCategory, "landmark"),
    name: search,
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
      // Custom areas are filtered client-side, so there is never a search
      // round-trip to wait on.
      isSearching: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => {},
    };
  }

  if (activeCategory !== "all") {
    const query = referenceQueries[activeCategory];
    return {
      // Reference rows are already filtered server-side; don't re-filter here
      // or fuzzy matches that aren't literal substrings would be dropped.
      rows: referenceRows[activeCategory],
      isLoading: query.isLoading,
      isSearching: isSearchInFlight(query),
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
    isSearching: REFERENCE_AOI_SOURCES.some((s) =>
      isSearchInFlight(referenceQueries[s])
    ),
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
