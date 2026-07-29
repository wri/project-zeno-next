import type { AoiSearchResult, DashboardAoi } from "../api/schemas";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import type { CreateCustomAreaResponse } from "@/app/schemas/api/custom_areas/post";

/** Canonical reference-dataset sources accepted by POST /api/dashboards. */
export const REFERENCE_AOI_SOURCES = [
  "gadm",
  "kba",
  "wdpa",
  "landmark",
] as const;

export type ReferenceAoiSource = (typeof REFERENCE_AOI_SOURCES)[number];

export const REFERENCE_AOI_SOURCE_LABELS: Record<ReferenceAoiSource, string> = {
  gadm: "Administrative areas",
  kba: "Key biodiversity areas",
  wdpa: "Protected areas",
  landmark: "Indigenous lands",
};

/** User-facing picker sections — reference datasets first, then custom areas last. */
export const AREA_PICKER_SECTIONS = [
  ...REFERENCE_AOI_SOURCES.map((source) => ({
    id: source,
    label: REFERENCE_AOI_SOURCE_LABELS[source],
  })),
  { id: "custom" as const, label: "Custom areas" },
] as const;

export type AreaPickerSectionId = (typeof AREA_PICKER_SECTIONS)[number]["id"];

/** Selection state shared by browse list, saved areas, and post-upload pick. */
export interface DashboardAreaSelection {
  source: string;
  src_id: string;
  subtype: string;
  name: string;
}

export function aoiSearchResultToDashboardAoi(
  result: AoiSearchResult
): DashboardAoi {
  return {
    source: result.source,
    src_id: result.src_id,
    subtype: result.subtype,
    name: result.name,
  };
}

export function customAreaToDashboardAoi(
  area: Pick<CreateCustomAreaResponse, "id" | "name"> | CustomArea
): DashboardAoi {
  return {
    source: "custom",
    src_id: area.id,
    subtype: "custom-area",
    name: area.name,
  };
}

export function isValidDashboardAreaSelection(
  selection: DashboardAreaSelection | null
): selection is DashboardAreaSelection {
  if (!selection) return false;
  return (
    selection.source.length > 0 &&
    selection.src_id.length > 0 &&
    selection.subtype.length > 0 &&
    selection.name.length > 0
  );
}
