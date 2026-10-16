/** What kind of area a source identifies, as the meta line under an area's name. */
const AREA_SOURCE_LABELS: Record<string, string> = {
  gadm: "Administrative area",
  kba: "Key biodiversity area",
  wdpa: "Protected area",
  landmark: "Indigenous territory",
  custom: "Custom area",
};

/**
 * The one place an area's source becomes words ("gadm" → "Administrative
 * area"), so the chat card, the Areas panel and the picker agree. Sources
 * arrive in either case ("GADM", "gadm"); an unknown one is shown capitalised,
 * and no source at all reads "Area".
 */
export function areaTypeLabel(source: string | null | undefined): string {
  const key = source?.trim().toLowerCase();
  if (!key) return "Area";
  return AREA_SOURCE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
