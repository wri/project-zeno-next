import { Layer, Source, MapMouseEvent } from "react-map-gl/maplibre";
import { FeatureCollection, Polygon } from "geojson";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import { useCallback, useEffect, useState } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import AreaTooltip, { HoverInfo } from "@/app/components/ui/AreaTooltip";

const CUSTOM_AREAS_SOURCE_ID = "custom-areas-source";

function CustomAreasLayer() {
  const { customAreas, isLoading, error } = useCustomAreasList();
  const { mapRef } = useMapStore();
  const { addContext } = useContextStore();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features.find(
          (f) => f.source === CUSTOM_AREAS_SOURCE_ID
        );
        if (feature) {
          const { name } = feature.properties;
          addContext({
            contextType: "area",
            content: name,
            aoiData: {
              name,
              source: "custom",
            },
          });
        }
      }
    },
    [addContext]
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

    map.on("click", "custom-areas-fill", handleClick);
    map.on("mouseenter", "custom-areas-fill", handleMouseEnter);
    map.on("mouseleave", "custom-areas-fill", handleMouseLeave);

    return () => {
      map.off("click", "custom-areas-fill", handleClick);
      map.off("mouseenter", "custom-areas-fill", handleMouseEnter);
      map.off("mouseleave", "custom-areas-fill", handleMouseLeave);
    };
  }, [mapRef, handleClick]);

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
          paint={{
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#fbbf24",
              "#f59e0b",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.7,
              0.2,
            ],
          }}
          filter={["==", ["geometry-type"], "Polygon"]}
        />
        <Layer
          id="custom-areas-line"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#f59e0b",
              "#d97706",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              4,
              3,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1,
              0.8,
            ],
          }}
          filter={["==", ["geometry-type"], "Polygon"]}
        />
      </Source>
      {hoverInfo && <AreaTooltip hoverInfo={hoverInfo} />}
    </>
  );
}

export default CustomAreasLayer;
