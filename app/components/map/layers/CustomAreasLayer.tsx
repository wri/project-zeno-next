import { Layer, Source, MapMouseEvent } from "react-map-gl/maplibre";
import { FeatureCollection, Polygon } from "geojson";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";
import { useEffect } from "react";
import useMapStore from "@/app/store/mapStore";

const CUSTOM_AREAS_SOURCE_ID = "custom-areas-source";

function CustomAreasLayer() {
  const { customAreas, isLoading, error } = useCustomAreasList();
  const { mapRef } = useMapStore();

  const handleClick = (e: MapMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features.find(
        (f) => f.source === CUSTOM_AREAS_SOURCE_ID
      );
      if (feature) {
        console.log("Clicked custom area:", feature.properties);
      }
    }
  };

  useEffect(() => {
    if (!mapRef) return;

    const map = mapRef.getMap();

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
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
    <Source
      id={CUSTOM_AREAS_SOURCE_ID}
      type="geojson"
      data={customAreasCollection}
    >
      <Layer
        id="custom-areas-fill"
        type="fill"
        paint={{
          "fill-color": "#f59e0b",
          "fill-opacity": 0.4,
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
  );
}

export default CustomAreasLayer;
