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
import {
  AbsoluteCenter,
  Code,
  Box,
  Button,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ListDashesIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import useMapStore from "@/app/store/mapStore";
import MapAreaControls from "./MapAreaControls";
import useContextStore from "@/app/store/contextStore";
import DynamicTileLayers from "./map/layers/DynamicTileLayers";
import HighlightedFeaturesLayer from "./map/layers/HighlightedFeaturesLayer";
import SelectAreaLayer from "./map/layers/select-area-layer";
import { useLegendHook } from "@/app/components/legend/useLegendHook";
import { Legend } from "@/app/components/legend/Legend";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function Map({ disableMapAreaControls }: { disableMapAreaControls?: boolean }) {
  const mapRef = useRef<MapRef>(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [showLegend, setShowLegend] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { geoJsonFeatures, setMapRef, initializeTerraDraw } = useMapStore();
  const { layers, handleLayerAction } = useLegendHook();
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
            borderColor: "bg.subtle",
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
              "&+button": { borderColor: "border.muted" },
              "&:not(:disabled):hover": {
                bgColor: "bg.muted",
                color: "fg",
              },
              "& .maplibregl-ctrl-icon": {
                filter: "invert(1)",
              },
            },
          },
        },
        "& .maplibregl-ctrl-attrib.maplibregl-compact": {
          mb: 6,
          opacity: 0.8,
          transition: "opacity 0.16s ease",
          _hover: { opacity: 1 },
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
          tiles={[
            `https://api.mapbox.com/styles/v1/devseed/cmazl5ws500bz01scaa27dqi4/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
          ]}
          tileSize={256}
        >
          <Layer id="background-tiles" type="raster" />
        </Source>
        {layers.length > 0 && (
          <Button
            variant="subtle"
            position="absolute"
            bottom={6}
            right={3}
            key="legendButton"
            size="xs"
            bg={showLegend ? "bg.muted" : "bg"}
            _active={{ bg: "bg.muted" }}
            flexDirection="column"
            h="auto"
            px={3}
            py={1}
            gap={0}
            lineHeight="0.875rem"
            hideFrom="md"
            zIndex={500}
            pointerEvents="all"
            onClick={() => setShowLegend((prev) => !prev)}
            fontFamily="body"
            color="fg.muted"
          >
            {!showLegend ? <ListDashesIcon /> : <XIcon />}
            Legend
          </Button>
        )}
        <Box display={{ base: showLegend ? "inherit" : "none", md: "inherit" }}>
          <Legend layers={layers} onLayerAction={handleLayerAction} />
        </Box>

        <HighlightedFeaturesLayer
          geoJsonFeatures={geoJsonFeatures}
          areas={areas}
        />
        <SelectAreaLayer />
        <DynamicTileLayers />

        {!disableMapAreaControls && <MapAreaControls />}

        <AbsoluteCenter fontSize="sm" opacity={0.375} hideBelow="md">
          <PlusIcon />
        </AbsoluteCenter>
        <AttributionControl
          customAttribution="Background tiles: © <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>"
          position="bottom-right"
          compact={isMobile ? true : false}
          style={{
            background: "transparent",
            fontSize: "0.675rem",
            color: "gray",
          }}
        />
        {!isMobile && (
          <>
            <ScaleControl position="bottom-left" />
            <NavigationControl showCompass={false} position="bottom-left" />
          </>
        )}
        <Code
          pos="absolute"
          bottom="0"
          right="0"
          p="2"
          size="xs"
          bg="transparent"
          hideBelow="md"
        >
          lat, lon: {mapCenter[1].toFixed(3)}, {mapCenter[0].toFixed(3)}
        </Code>
      </MapGl>
    </Box>
  );
}

export default Map;
