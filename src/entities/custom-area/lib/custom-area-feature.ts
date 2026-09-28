import type { Feature, MultiPolygon } from "geojson";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import { toPolygons } from "@/app/utils/selectionPolygons";

/** Merges a saved custom area's Polygon/MultiPolygon parts into one feature. */
export function customAreaToFeature(
  area: Pick<CustomArea, "id" | "name" | "geometries">
): Feature<MultiPolygon> {
  return {
    type: "Feature",
    id: area.id,
    geometry: {
      type: "MultiPolygon",
      coordinates: area.geometries
        .flatMap((geometry) => toPolygons(geometry))
        .map((polygon) => polygon.coordinates),
    },
    properties: { id: area.id, name: area.name },
  };
}
