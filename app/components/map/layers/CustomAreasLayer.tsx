import { Layer, Source, MapMouseEvent } from "react-map-gl/maplibre";
import { FeatureCollection, Polygon } from "geojson";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import { useEffect, useState } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import AreaTooltip, { HoverInfo } from "@/app/components/ui/AreaTooltip";

const CUSTOM_AREAS_SOURCE_ID = "custom-areas-source";

function CustomAreasLayer() {
  const { customAreas, isLoading, error } = useCustomAreasList();
  const { mapRef } = useMapStore();
  const { addContext } = useContextStore();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();

  const handleClick = (e: MapMouseEvent) => {
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
  };

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
  }, [mapRef]);

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
            "fill-color": "#f59e0b",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.6,
              0.4,
            ],
          }}
          filter={["==", ["geometry-type"], "Polygon"]}
        />
        <Layer
          id="custom-areas-line"
          type="line"
          paint={{
            "line-color": "#d97706",
            "line-width": 3,
          }}
          filter={[
            "in",
            ["geometry-type"],
            ["literal", ["Polygon", "LineString"]],
          ]}
        />
        <Layer
          id="custom-areas-circle"
          type="circle"
          paint={{
            "circle-color": "#d97706",
            "circle-radius": 8,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
          filter={["==", ["geometry-type"], "Point"]}
        />
      </Source>
      {hoverInfo && <AreaTooltip hoverInfo={hoverInfo} />}
    </>
  );
}

export default CustomAreasLayer;
