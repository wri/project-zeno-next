import { useCallback } from "react";
import type { Feature, MultiPolygon } from "geojson";
import {
  CUSTOM_AREA_SOURCE,
  CUSTOM_AREA_SUBTYPE,
} from "../constants/custom-areas";
import type { CustomArea } from "../schemas/api/custom_areas/get";
import useContextStore from "../store/contextStore";
import useMapStore from "../store/mapStore";

export function useSelectCustomArea() {
  const { upsertContextByType } = useContextStore();
  const { addToRegistry, addLayer, flyToGeoJsonWithRetry } = useMapStore();

  return useCallback(
    (area: CustomArea) => {
      upsertContextByType({
        contextType: "area",
        content: area.name,
        aoiData: {
          src_id: area.id,
          name: area.name,
          source: CUSTOM_AREA_SOURCE,
          subtype: CUSTOM_AREA_SUBTYPE,
        },
      });
      const multi: MultiPolygon = {
        type: "MultiPolygon",
        coordinates: area.geometries.map((poly) => poly.coordinates),
      };
      const feature: Feature = {
        type: "Feature",
        id: area.id,
        geometry: multi,
        properties: { id: area.id, name: area.name },
      };
      addToRegistry({
        ref: { name: area.name, source: CUSTOM_AREA_SOURCE },
        data: feature,
        srcId: area.id,
        subtype: CUSTOM_AREA_SUBTYPE,
      });
      addLayer({
        id: area.id,
        name: area.name,
        type: "geojson",
        visible: true,
        featureRefs: [{ name: area.name, source: CUSTOM_AREA_SOURCE }],
      });
      flyToGeoJsonWithRetry(feature);
    },
    [upsertContextByType, addToRegistry, addLayer, flyToGeoJsonWithRetry]
  );
}
