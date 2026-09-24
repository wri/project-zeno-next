import type { CreateCustomAreaResponse } from "@/app/schemas/api/custom_areas/post";
import type { UploadCustomAreasResponse } from "@/app/schemas/api/custom_areas/upload";

/**
 * What a successful area upload created. GeoJSON creates one area and returns
 * its geometry (the map draws it straight away); CSV/zip creates one area per
 * row and returns only ids and names.
 */
export type UploadedAreas =
  | { kind: "geojson"; area: CreateCustomAreaResponse }
  | { kind: "batch"; areas: UploadCustomAreasResponse["areas"] };

/** The created areas' ids and names, whichever upload path made them. */
export function uploadedAreaRefs(
  result: UploadedAreas
): Array<{ id: string; name: string }> {
  return result.kind === "geojson"
    ? [{ id: result.area.id, name: result.area.name }]
    : result.areas;
}
