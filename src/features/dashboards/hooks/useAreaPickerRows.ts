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
  type AreaPickerSectionId,
  type ReferenceAoiSource,
} from "../model/dashboard-area";

const REFERENCE_SOURCES: ReferenceAoiSource[] = [
  "gadm",
  "kba",
  "wdpa",
  "landmark",
];

export interface AreaPickerRowsResult {
  rows: AreaPickerRow[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Composes the existing per-source data hooks into the merged, filtered row
 * list the new-dashboard picker table renders. All underlying hooks are
 * always called (hooks can't be conditional); only the ones relevant to
 * `activeCategory` drive the returned rows/pagination state.
 */
export function useAreaPickerRows(
  activeCategory: AreaPickerSectionId | "all",
  search: string
): AreaPickerRowsResult {
  const { customAreas, isLoading: customLoading } = useCustomAreasList();
  const { data: dashboards } = useDashboardsList();

  const gadm = useAoiBrowse("gadm");
  const kba = useAoiBrowse("kba");
  const wdpa = useAoiBrowse("wdpa");
  const landmark = useAoiBrowse("landmark");
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
    for (const source of REFERENCE_SOURCES) {
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
    ...referenceRows.gadm,
    ...referenceRows.kba,
    ...referenceRows.wdpa,
    ...referenceRows.landmark,
    ...customRows,
  ];

  return {
    rows: filterRowsBySearch(merged, search),
    isLoading:
      customLoading ||
      REFERENCE_SOURCES.some((s) => referenceQueries[s].isLoading),
    hasNextPage: REFERENCE_SOURCES.some((s) => referenceQueries[s].hasNextPage),
    isFetchingNextPage: REFERENCE_SOURCES.some(
      (s) => referenceQueries[s].isFetchingNextPage
    ),
    fetchNextPage: () => {
      for (const source of REFERENCE_SOURCES) {
        const query = referenceQueries[source];
        if (query.hasNextPage) query.fetchNextPage();
      }
    },
  };
}
