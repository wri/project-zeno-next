import type { AoiSearchResult, DashboardCreateRequest } from "../api/schemas";

export const AOI_SOURCE_OPTIONS = [
  { label: "All categories", source: null },
  { label: "Administrative areas", source: "gadm" },
  { label: "Key biodiversity areas", source: "kba" },
  { label: "Protected areas", source: "wdpa" },
  { label: "Indigenous lands", source: "landmark" },
  { label: "Custom areas", source: "custom" },
] as const;

export type AoiSource = NonNullable<
  (typeof AOI_SOURCE_OPTIONS)[number]["source"]
>;

const SOURCE_LABELS: Record<AoiSource, string> = {
  gadm: "Administrative areas",
  kba: "Key biodiversity areas",
  wdpa: "Protected areas",
  landmark: "Indigenous lands",
  custom: "Custom areas",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source as AoiSource] ?? source;
}

export function subtypeLabel(subtype: string): string {
  const words = subtype.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

export function aoiToDashboardCreateRequest(
  aoi: AoiSearchResult
): DashboardCreateRequest {
  return {
    name: aoi.name,
    aois: [
      {
        source: aoi.source,
        src_id: aoi.src_id,
        subtype: aoi.subtype,
        name: aoi.name,
      },
    ],
  };
}
