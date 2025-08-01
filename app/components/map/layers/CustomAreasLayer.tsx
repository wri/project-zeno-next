import { Layer, Source } from "react-map-gl/maplibre";
import { FeatureCollection, Polygon } from "geojson";
import { useCustomAreasList } from "@/app/hooks/useCustomAreasList";

function CustomAreasLayer() {
  const { customAreas, isLoading, error } = useCustomAreasList();

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
      id="custom-areas-source"
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
