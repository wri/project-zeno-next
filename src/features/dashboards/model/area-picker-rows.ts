import type { CustomArea } from "@/app/schemas/api/custom_areas/get";

import type { AoiSearchResult, Dashboard } from "../api/schemas";

/** A single row in the new-dashboard area picker table. */
export interface AreaPickerRow {
  source: string;
  src_id: string;
  subtype: string;
  name: string;
  typeLabel: string;
  previousAnalyses: number;
  /** `[west, south, east, north]` when the search result provided one — powers
   * the static-map thumbnail without a geometry fetch. */
  bbox?: number[];
}

function analysesKey(source: string, srcId: string): string {
  return `${source}:${srcId}`;
}

/** Tallies how many existing dashboards are fixed to each AOI (source+src_id). */
export function buildPreviousAnalysesMap(
  dashboards: Dashboard[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const dashboard of dashboards) {
    for (const aoi of dashboard.aois) {
      const key = analysesKey(aoi.source, aoi.src_id);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

export function aoiSearchResultToRow(
  result: AoiSearchResult,
  typeLabel: string,
  analysesMap: Map<string, number>
): AreaPickerRow {
  return {
    source: result.source,
    src_id: result.src_id,
    subtype: result.subtype,
    name: result.name,
    typeLabel,
    previousAnalyses:
      analysesMap.get(analysesKey(result.source, result.src_id)) ?? 0,
    ...(result.bbox ? { bbox: result.bbox } : {}),
  };
}

export function customAreaToRow(
  area: Pick<CustomArea, "id" | "name">,
  analysesMap: Map<string, number>
): AreaPickerRow {
  return {
    source: "custom",
    src_id: area.id,
    subtype: "custom-area",
    name: area.name,
    typeLabel: "Custom area",
    previousAnalyses: analysesMap.get(analysesKey("custom", area.id)) ?? 0,
  };
}

/** Client-side, case-insensitive substring filter over already-loaded rows. */
export function filterRowsBySearch(
  rows: AreaPickerRow[],
  search: string
): AreaPickerRow[] {
  const trimmed = search.trim().toLowerCase();
  if (!trimmed) return rows;
  return rows.filter((row) => row.name.toLowerCase().includes(trimmed));
}
