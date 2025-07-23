"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import MapGl, {
  Layer,
  Source,
  AttributionControl,
  NavigationControl,
  ScaleControl,
  MapRef,
} from "react-map-gl/maplibre";
import { useState, useRef } from "react";
import { AbsoluteCenter, Code, Box } from "@chakra-ui/react";
import { PlusIcon } from "@phosphor-icons/react";
import { useColorModeValue } from "./ui/color-mode";
import useMapStore from "@/app/store/mapStore";
import MapAreaControls from "./MapAreaControls";
import SelectAreaLayer from "./SelectAreaLayer";
import useContextStore from "@/app/store/contextStore";
import CustomAreasLayer from "./map/layers/CustomAreasLayer";

function Map() {
  const mapRef = useRef<MapRef>(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const { geoJsonFeatures, setMapRef, selectAreaLayer, initializeTerraDraw } =
    useMapStore();
  const { context } = useContextStore();
  const areas = context.filter((c) => c.contextType === "area");

  const onMapLoad = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      setMapCenter([map.getCenter().lng, map.getCenter().lat]);
      // Set the map ref in the store for other components to use
      setMapRef(mapRef.current);

      initializeTerraDraw(map);
    }
  };

  // Update map center when map moves
  const onMapMove = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      setMapCenter([map.getCenter().lng, map.getCenter().lat]);
    }
  };

  return (
    <Box
      position="relative"
      height="100%"
      css={{
        _dark: {
          "& .maplibregl-ctrl-scale": {
            bgColor: "black/20",
            color: "fg",
            borderColor: "bg.muted",
          },
          "& .maplibregl-ctrl.maplibregl-ctrl-attrib": {
            bgColor: "black/40",
            "& a": { color: "fg" },
          },
          "& .maplibregl-ctrl-group": {
            bg: "bg",
            color: "fg",
            boxShadow: "lg",
            boxShadowColor: "white",
            "& button": {
              "&+button": { borderColor: "border.emphasized" },
              "&:not(:disabled):hover": {
                bgColor: "bg.emphasized",
                color: "fg",
              },
              "& .maplibregl-ctrl-icon": {
                filter: "invert(1)",
              },
            },
          },
        },
      }}
    >
      <MapGl
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 0,
        }}
        onLoad={onMapLoad}
        onMove={onMapMove}
        attributionControl={false}
      >
        <Source
          id="background"
          type="raster"
          tiles={useColorModeValue(
            [
              "https://api.mapbox.com/styles/v1/devseed/cmazl5ws500bz01scaa27dqi4/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGV2c2VlZCIsImEiOiJnUi1mbkVvIn0.018aLhX0Mb0tdtaT2QNe2Q",
            ],
            [
              "https://api.mapbox.com/styles/v1/devseed/clz35cbi302l701qo2snhdx9x/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGV2c2VlZCIsImEiOiJnUi1mbkVvIn0.018aLhX0Mb0tdtaT2QNe2Q",
            ]
          )}
          tileSize={256}
        >
          <Layer id="background-tiles" type="raster" />
        </Source>

        {/* Render GeoJSON features */}
        {geoJsonFeatures.map((feature) => {
          const fillColor = areas.find((a) => a.content === feature.id)
            ? "#3b82f6"
            : "#555";

          return (
            <Source
              key={feature.id}
              id={`geojson-source-${feature.id}`}
              type="geojson"
              data={feature.data}
            >
              {/* Fill layer for polygons */}
              <Layer
                id={`geojson-fill-${feature.id}`}
                type="fill"
                paint={{
                  "fill-color": fillColor,
                  "fill-opacity": 0.3,
                }}
                filter={["==", ["geometry-type"], "Polygon"]}
              />
            </Source>
          );
        })}

        {selectAreaLayer && (
          <SelectAreaLayer
            key={selectAreaLayer}
            layerId={selectAreaLayer}
            beforeId={undefined}
          />
        )}
        <CustomAreasLayer />
        <MapAreaControls />

        <AttributionControl
          customAttribution="Background tiles: © <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>"
          position="bottom-left"
        />
        <ScaleControl />
        <AbsoluteCenter fontSize="sm">
          <PlusIcon />
        </AbsoluteCenter>
        <NavigationControl showCompass={false} position="bottom-left" />
        <Code
          pos="absolute"
          bottom="0"
          right="0"
          p="2"
          borderRadius={8}
          fontSize="10px"
          bg={useColorModeValue("whiteAlpha.600", "blackAlpha.600")}
          boxShadow="sm"
        >
          lat, lon: {mapCenter[1].toFixed(3)}, {mapCenter[0].toFixed(3)}
        </Code>
      </MapGl>
    </Box>
  );
}

export default Map;
