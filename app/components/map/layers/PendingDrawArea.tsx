import { Source, Layer as MapLayer } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import { createBboxPolygon } from "@/app/utils/bboxUtils";
import { BasemapTheme } from "../BasemapSelector";

interface PendingDrawAreaProps {
  basemapTheme: BasemapTheme;
}

/**
 * Renders the standard selection treatment — casing + outline + bbox — for a
 * just-completed (not yet confirmed) drawn polygon. Matches the paint of a
 * selected AOI in GeoJsonLayers so a drawn shape looks identical to a picked
 * one. The anchored label/confirm controls live in MapAreaControls.
 */
function PendingDrawArea({ basemapTheme }: PendingDrawAreaProps) {
  const pendingDrawnArea = useMapStore((s) => s.pendingDrawnArea);

  if (!pendingDrawnArea) return null;

  // On dark basemaps boundaries use white lines + blue casing for contrast; on
  // light basemaps the colours are inverted (same rules as GeoJsonLayers).
  const casingColor = basemapTheme === "dark" ? "#172B7A" : "#FFFFFF";
  const mainLineColor = basemapTheme === "dark" ? "#FFFFFF" : "#172B7A";

  const bboxPolygon = createBboxPolygon(pendingDrawnArea.bbox);

  return (
    <>
      <Source
        id="pending-draw-source"
        type="geojson"
        data={pendingDrawnArea.geometry}
        generateId={true}
      >
        {/* Casing layer (wider, contrasting colour) below the main line */}
        <MapLayer
          id="pending-draw-casing"
          type="line"
          paint={{
            "line-color": casingColor,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              3,
              3.5,
              6,
              7,
              10,
              11,
            ],
          }}
        />
        <MapLayer
          id="pending-draw-line"
          type="line"
          paint={{
            "line-color": mainLineColor,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              3,
              1,
              6,
              1.5,
              10,
              2,
            ],
          }}
        />
      </Source>
      <Source
        id="pending-draw-bbox-source"
        type="geojson"
        data={bboxPolygon}
        generateId={true}
      >
        {/* Solid bbox, matching a selected (in-context) AOI in GeoJsonLayers. */}
        <MapLayer
          id="pending-draw-bbox-line"
          type="line"
          paint={{
            "line-color": mainLineColor,
            "line-width": 1.5,
            "line-opacity": 0.75,
          }}
        />
      </Source>
    </>
  );
}

export default PendingDrawArea;
