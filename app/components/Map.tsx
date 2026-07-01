"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import MapGl, { Layer, Source, MapRef } from "react-map-gl/maplibre";
import { useState, useRef, useEffect, Suspense } from "react";
import { registerPrimaryForestProtocol } from "@/app/utils/primaryForestTileProtocol";
import {
  AbsoluteCenter,
  Code,
  Box,
  Button,
  Flex,
  Link as ChLink,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { ListDashesIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import useMapStore from "@/app/store/mapStore";
import useCookieStore from "@/app/store/cookieStore";
import { URLS } from "@/app/constants/urls";
import MapAreaControls from "./MapAreaControls";
import { basemapOptions } from "./map/BasemapSelector";
import DynamicTileLayers, {
  RASTER_TOP_SENTINEL_ID,
} from "./map/layers/DynamicTileLayers";
import VectorDataLayers from "./map/layers/VectorDataLayers";
import AoiVectorTileLayers from "./map/layers/AoiVectorTileLayers";
import SelectAreaLayer from "./map/layers/select-area-layer";
import { useLegendHook } from "@/app/components/legend/useLegendHook";
import GeoJsonLayers from "./map/layers/GeoJsonLayers";
import PendingDrawArea from "./map/layers/PendingDrawArea";
import { Legend } from "@/app/components/legend/Legend";
import InsightWorkspace from "./InsightWorkspace";
import DisclaimerPanel from "./DisclaimerPanel";
import useInsightStore from "@/app/store/insightStore";
import useChatStore from "@/app/store/chatStore";
import { buildBasemapTileUrl } from "@/app/utils/basemapTileUrl";
import DebugToastsPanel from "@/app/components/DebugToastsPanel";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function Map({ disableMapAreaControls }: { disableMapAreaControls?: boolean }) {
  const mapRef = useRef<MapRef>(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [showLegend, setShowLegend] = useState(false);
  const [basemapTiles, setBasemapTiles] = useState(
    "devseed/cmazl5ws500bz01scaa27dqi4"
  );
  const { setMapRef, initializeTerraDraw } = useMapStore();
  useEffect(() => {
    registerPrimaryForestProtocol();
  }, []);
  const { layers, handleLayerAction, aois, handleRemoveAoi } = useLegendHook();
  const basemapTheme =
    basemapOptions.find((o) => o.tileUrl === basemapTiles)?.theme ?? "light";
  const hasInsights = useInsightStore((s) => s.insights.length > 0);
  // Also mount while the agent is processing so the workspace can show its
  // generating skeleton on a first analysis (before any insight exists).
  const isLoading = useChatStore((s) => s.isLoading);
  const consentStatus = useCookieStore((s) => s.consentStatus);
  const openPreferences = useCookieStore((s) => s.openPreferences);
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
      overflow="hidden"
      gridArea="map"
      height="100%"
      bg={mapRef.current ? "transparent" : "neutral.200"}
      css={{
        _dark: {
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
      {!mapRef.current && (
        <AbsoluteCenter>
          <Spinner size="xl" borderWidth="4px" color="primary.solid" />
        </AbsoluteCenter>
      )}
      <MapGl
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        minZoom={2}
        initialViewState={{
          longitude: -10,
          latitude: 15,
          zoom: 2,
        }}
        onLoad={onMapLoad}
        onMove={onMapMove}
        attributionControl={false}
      >
        <Source
          id="background"
          type="raster"
          tiles={[
            buildBasemapTileUrl(
              basemapTiles,
              MAPBOX_ACCESS_TOKEN,
              typeof window === "undefined" ? 1 : window.devicePixelRatio
            ),
          ]}
        >
          <Layer id="background-tiles" type="raster" />
        </Source>
        {(layers.length > 0 || aois.length > 0) && (
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
        {/* Top-left overlay: disclaimer panel */}
        <Box
          position="absolute"
          top={2}
          left={3}
          zIndex={400}
          maxW="400px"
          w="calc(100% - 2rem)"
          pointerEvents="all"
          hideBelow="md"
        >
          <DisclaimerPanel />
        </Box>
        {/* Right overlay column: insight panel (top, scrollable) + legend (bottom) */}
        <Flex
          position="absolute"
          top={4}
          right={3}
          bottom={{ base: "4.5rem", md: 7 }}
          zIndex={400}
          w="420px"
          flexDirection="column"
          gap={2}
          pointerEvents="none"
        >
          {(hasInsights || isLoading) && <InsightWorkspace />}
          {/* Spacer: pushes legend to the bottom */}
          <Box flex="1 1 0" minH="0" />
          <Box
            flexShrink={0}
            display={{ base: showLegend ? "block" : "none", md: "block" }}
          >
            {/* Debug panel floats just left of this column, bottom-aligned */}
            <Box
              position="absolute"
              bottom={0}
              right="calc(100% + 0.5rem)"
              pointerEvents="all"
            >
              <Suspense fallback={null}>
                <DebugToastsPanel />
              </Suspense>
            </Box>
            <Legend
              layers={layers}
              onLayerAction={handleLayerAction}
              aois={aois}
              onRemoveAoi={handleRemoveAoi}
            />
          </Box>
        </Flex>
        {/* Sentinel layer: caps raster layers below AOI/GeoJSON outlines.
            Must be added before DynamicTileLayers so the sentinel exists
            when the topmost raster layer references it as beforeId. */}
        <Source
          id="raster-top-sentinel-source"
          type="geojson"
          data={{ type: "FeatureCollection", features: [] }}
        >
          <Layer id={RASTER_TOP_SENTINEL_ID} type="line" paint={{}} />
        </Source>
        <DynamicTileLayers />
        <VectorDataLayers />
        <AoiVectorTileLayers basemapTheme={basemapTheme} />
        <GeoJsonLayers basemapTheme={basemapTheme} />
        <PendingDrawArea basemapTheme={basemapTheme} />
        <SelectAreaLayer />

        {!disableMapAreaControls && (
          <MapAreaControls
            basemapTiles={basemapTiles}
            setBasemapTiles={setBasemapTiles}
          />
        )}

        <AbsoluteCenter fontSize="sm" opacity={0.375} hideBelow="md">
          <PlusIcon />
        </AbsoluteCenter>
        <Flex
          pos="absolute"
          bottom="0"
          right="3"
          px="2"
          py="1"
          fontSize="0.675rem"
          color="gray"
          bg="transparent"
          hideBelow="md"
          alignItems="center"
          gap={2}
        >
          {consentStatus !== "pending" && (
            <Text
              as="button"
              onClick={openPreferences}
              textDecoration="underline"
              color="fg.muted"
              cursor="pointer"
              fontSize="inherit"
              fontFamily="inherit"
              lineHeight="inherit"
              bg="transparent"
              border="none"
              p={0}
            >
              Cookie Policy
            </Text>
          )}
          <ChLink
            href={URLS.privacyPolicy}
            target="_blank"
            rel="noopener noreferrer"
            textDecoration="underline"
            color="fg.muted"
          >
            Privacy Policy
          </ChLink>
          <ChLink
            href={URLS.aiPrivacyPolicy}
            target="_blank"
            rel="noopener noreferrer"
            textDecoration="underline"
            color="fg.muted"
          >
            AI Privacy Policy
          </ChLink>
          <ChLink
            href={URLS.termsOfUse}
            target="_blank"
            rel="noopener noreferrer"
            textDecoration="underline"
            color="fg.muted"
          >
            Terms of Use
          </ChLink>
          <ChLink
            href={URLS.aiTermsOfUse}
            target="_blank"
            rel="noopener noreferrer"
            textDecoration="underline"
            color="fg.muted"
          >
            AI Terms of Use
          </ChLink>
          <Code
            bg="transparent"
            p={0}
            color="fg.muted"
            ml={2}
            fontSize="0.625rem"
          >
            lat, lon: {mapCenter[1].toFixed(3)}, {mapCenter[0].toFixed(3)}
          </Code>
          <Box as="span" ml={2}>
            Background tiles: ©{" "}
            <ChLink
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
            >
              OpenStreetMap contributors
            </ChLink>
          </Box>
        </Flex>
      </MapGl>
    </Box>
  );
}

export default Map;
