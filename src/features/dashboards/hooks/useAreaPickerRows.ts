import { useMemo } from "react";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import { useDashboardsList } from "./useDashboardsList";
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
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
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
  const { data: dashboards } = useDashboardsList();

  const gadm = useAoiBrowse("gadm", {
    enabled: isReferenceSourceEnabled(activeCategory, "gadm"),
  });
  const kba = useAoiBrowse("kba", {
    enabled: isReferenceSourceEnabled(activeCategory, "kba"),
  });
  const wdpa = useAoiBrowse("wdpa", {
    enabled: isReferenceSourceEnabled(activeCategory, "wdpa"),
  });
  const landmark = useAoiBrowse("landmark", {
    enabled: isReferenceSourceEnabled(activeCategory, "landmark"),
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
      rows: filterRowsBySearch(referenceRows[activeCategory], search),
      isLoading: query.isLoading,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      fetchNextPage: () => query.fetchNextPage(),
    };
  }

  const merged = [
    ...REFERENCE_AOI_SOURCES.flatMap((source) => referenceRows[source]),
    ...customRows,
  ];

  return {
    rows: filterRowsBySearch(merged, search),
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
        if (query.hasNextPage) query.fetchNextPage();
      }
    },
  };
}
