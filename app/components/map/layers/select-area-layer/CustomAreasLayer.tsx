import { Layer, Source, MapMouseEvent } from "react-map-gl/maplibre";
import { FeatureCollection, Polygon } from "geojson";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import { useCallback, useEffect, useState } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import AreaTooltip, { HoverInfo } from "@/app/components/ui/AreaTooltip";
import { sendGAEvent } from "@next/third-parties/google";
import { selectAreaFillPaint, selectAreaLinePaint } from "./mapStyles";

const CUSTOM_AREAS_SOURCE_ID = "custom-areas-source";

function CustomAreasLayer() {
  const { customAreas, isLoading, error } = useCustomAreasList();
  const { mapRef, addGeoJsonFeature, setSelectAreaLayer } = useMapStore();
  const { addContext } = useContextStore();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features.find(
          (f) => f.source === CUSTOM_AREAS_SOURCE_ID
        );
        if (feature) {
          const { name, id } = feature.properties;
          sendGAEvent("event", "map_area_selected", {
            area_name: name,
            area_source: "custom",
            area_subtype: "custom-area",
          });

          // Add feature to the all features list to be highlighted on the map
          addGeoJsonFeature({
            id: id,
            name: name,
            data: feature,
          });

          addContext({
            contextType: "area",
            content: name,
            aoiData: {
              src_id: id,
              name,
              source: "custom",
              subtype: "custom-area",
            },
          });
        }
      }
    },
    [addContext, addGeoJsonFeature]
  );

  useEffect(() => {
    if (!mapRef) return;

    const map = mapRef.getMap();
    let hoverId: string | number | undefined;

    const handleMouseEnter = (e: MapMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";

      if (e.features && e.features.length > 0) {
        const feature = e.features.find(
          (f) => f.source === CUSTOM_AREAS_SOURCE_ID
        );
        if (feature) {
          const { lat, lng } = e.lngLat;
          const { name } = feature.properties;
          setHoverInfo({
            lat,
            lng,
            name,
          });

          hoverId = feature.id;
          map.setFeatureState(
            { source: CUSTOM_AREAS_SOURCE_ID, id: hoverId },
            { hover: true }
          );
        }
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      setHoverInfo(undefined);

      if (hoverId !== undefined) {
        map.setFeatureState(
          { source: CUSTOM_AREAS_SOURCE_ID, id: hoverId },
          { hover: false }
        );
        hoverId = undefined;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectAreaLayer(null);
      }
    };

    map.on("click", "custom-areas-fill", handleClick);
    map.on("mouseenter", "custom-areas-fill", handleMouseEnter);
    map.on("mouseleave", "custom-areas-fill", handleMouseLeave);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      map.off("click", "custom-areas-fill", handleClick);
      map.off("mouseenter", "custom-areas-fill", handleMouseEnter);
      map.off("mouseleave", "custom-areas-fill", handleMouseLeave);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [mapRef, handleClick, setSelectAreaLayer]);

  if (isLoading) {
    return null;
  }

  if (error || !customAreas || customAreas.length === 0) {
    return null;
  }

  const allFeatures = customAreas.flatMap(({ id, name, geometries }) =>
    geometries.map((geometry: Polygon) => ({
      type: "Feature" as const,
      id,
      geometry,
      properties: {
        id,
        name,
      },
    }))
  );

  const customAreasCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: allFeatures,
  };

  return (
    <>
      <Source
        id={CUSTOM_AREAS_SOURCE_ID}
        type="geojson"
        data={customAreasCollection}
        generateId={true}
      >
        <Layer
          id="custom-areas-fill"
          type="fill"
          paint={selectAreaFillPaint}
          filter={["==", ["geometry-type"], "Polygon"]}
        />
        <Layer
          id="custom-areas-line"
          type="line"
          paint={selectAreaLinePaint}
          filter={["==", ["geometry-type"], "Polygon"]}
        />
      </Source>
      {hoverInfo && <AreaTooltip hoverInfo={hoverInfo} />}
    </>
  );
}

export default CustomAreasLayer;
