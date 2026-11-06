import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import useMapStore from "@/app/store/mapStore";
import { publishAnalysisSelection } from "@/app/utils/referenceArea";
import { customAreaToFeature } from "@/src/entities/custom-area";

const CUSTOM_AREA_SUBTYPE = "custom-area";

/**
 * Puts a just-created custom area (drawn or uploaded) on the map the way a
 * boundary click does: a visible area layer, its geometry in the registry, a
 * flyTo, and the analysis selection that both nudges consume — so the chat
 * offers View Analysis / Create Dashboard for it.
 *
 * Unlike a reference area, it doesn't replace the areas already on the map.
 * The layer is keyed by the area's id, as the Areas panel keys saved areas.
 */
export function addCustomAreaToMap(
  area: Pick<CustomArea, "id" | "name" | "geometries">
): void {
  const { addToRegistry, addLayer, flyToGeoJson } = useMapStore.getState();
  const feature = customAreaToFeature(area);
  const featureRef = { name: area.name, source: "custom" };

  addToRegistry({
    ref: featureRef,
    data: feature,
    srcId: area.id,
    subtype: CUSTOM_AREA_SUBTYPE,
  });
  // The visible layer IS the scope — no separate context item.
  addLayer({
    id: area.id,
    name: area.name,
    type: "geojson",
    visible: true,
    featureRefs: [featureRef],
  });
  publishAnalysisSelection({
    name: area.name,
    source: featureRef.source,
    srcId: area.id,
    subtype: CUSTOM_AREA_SUBTYPE,
  });

  flyToGeoJson(feature);
}
