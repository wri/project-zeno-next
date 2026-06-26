import { useEffect, useState } from "react";
import {
  Box,
  type BoxProps,
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Spinner,
  Tag,
} from "@chakra-ui/react";
import { Marker } from "react-map-gl/maplibre";
import {
  CheckIcon,
  MapTrifoldIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";

import { ChatContextOptions } from "./ContextButton";
import useMapStore from "../store/mapStore";
import useContextStore from "../store/contextStore";
import useSidebarStore from "../store/sidebarStore";
import { useCustomAreasCreate } from "../hooks/useCustomAreasCreate";
import { FeatureRef } from "../store/layerManagerSlice";
import { Tooltip } from "./ui/tooltip";
import { BasemapSelector } from "./map/BasemapSelector";
import { ScaleBar } from "./map/ScaleBar";
import { getMapControlsLeftPx } from "../explorationLayout";
import { MapAreaFeedbackMobile } from "./MapAreaFeedback";

function Wrapper({
  children,
  ...props
}: { children: React.ReactNode } & BoxProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      position="absolute"
      pt={2}
      pb={{ base: 4, md: 0 }}
      pl={{ base: 2, md: 3 }}
      gap={2}
      width="100%"
      height="100%"
      pointerEvents="none"
      justifyContent={{ base: "flex-end", md: "flex-start" }}
      alignItems="flex-start"
      zIndex={100}
      borderWidth="4px"
      {...props}
    >
      {children}
    </Box>
  );
}

interface MapAreaControlsProps {
  basemapTiles: string;
  setBasemapTiles: (tileUrl: string) => void;
}
function MapAreaControls({
  basemapTiles,
  setBasemapTiles,
}: MapAreaControlsProps) {
  const {
    isDrawingMode,
    pendingDrawnArea,
    selectionMode,
    clearSelectionMode,
    cancelDrawing,
    confirmDrawing,
    setCreateAreaFn,
    addLayer,
    addToRegistry,
    flyToGeoJson,
    mapRef,
  } = useMapStore();
  const { addContext } = useContextStore();
  const { isChatFullSize, dataCatalogOpen, areasPanelOpen } = useSidebarStore();
  const catalogColumnOpen = dataCatalogOpen || areasPanelOpen;
  const mapControlsLeft = `${getMapControlsLeftPx(isChatFullSize, catalogColumnOpen)}px`;

  const { createAreaAsync, isCreating } = useCustomAreasCreate();
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    setCreateAreaFn(createAreaAsync);
  }, [createAreaAsync, setCreateAreaFn]);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDrawingMode) {
          cancelDrawing();
        }
        clearSelectionMode();
      }
    };
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [clearSelectionMode, isDrawingMode, cancelDrawing]);

  const handleConfirmDrawing = async () => {
    try {
      const result = await confirmDrawing();
      if (!result) return;
      const {
        name,
        id,
        geometries: [geo],
      } = result;
      const feat: GeoJSON.Feature = {
        type: "Feature",
        geometry: geo,
        properties: {
          id: id,
          name: name,
        },
      };
      const featureRef: FeatureRef = { name: name, source: "custom" };

      addToRegistry({
        ref: featureRef,
        data: feat,
        srcId: id,
        subtype: "custom-area",
      });
      addLayer({
        id: featureRef.name,
        name: featureRef.name,
        type: "geojson",
        visible: true,
        featureRefs: [featureRef],
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

      flyToGeoJson(feat);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <Wrapper
      borderColor={selectionMode ? "secondary.400" : "transparent"}
      pl={{ base: 2, md: isChatFullSize ? 0 : 3 }}
    >
      {/* Chat-panel-adjacent controls: basemap + zoom — desktop only.
          bottom={8} (32px) aligns the stack with the bottom of ChatPanelCompact's
          input card — i.e. its pb + disclaimer height + mt. If that disclaimer's
          spacing changes, this offset must follow. */}
      <Flex
        display={{ base: "none", md: "flex" }}
        position="absolute"
        bottom={8}
        left={{ base: 2, md: mapControlsLeft }}
        flexDirection="column"
        gap={1}
        pointerEvents="auto"
        zIndex={200}
        alignItems="flex-start"
      >
        <BasemapSelector
          inline
          currentBasemap={basemapTiles}
          onBasemapChange={setBasemapTiles}
        />
        <Box
          bg="white"
          borderRadius="4px"
          boxShadow="0 0 0 2px rgba(0,0,0,0.1)"
          overflow="hidden"
        >
          <Tooltip content="Zoom in" positioning={{ placement: "right" }}>
            <IconButton
              aria-label="Zoom in"
              size="sm"
              variant="ghost"
              bg="white"
              color="black"
              borderRadius={0}
              _hover={{ bg: "gray.100" }}
              onClick={() => mapRef?.getMap().zoomIn()}
            >
              <PlusIcon />
            </IconButton>
          </Tooltip>
          <Box h="1px" bg="rgba(0,0,0,0.1)" />
          <Tooltip content="Zoom out" positioning={{ placement: "right" }}>
            <IconButton
              aria-label="Zoom out"
              size="sm"
              variant="ghost"
              bg="white"
              color="black"
              borderRadius={0}
              _hover={{ bg: "gray.100" }}
              onClick={() => mapRef?.getMap().zoomOut()}
            >
              <MinusIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <ScaleBar mapRef={mapRef} />
      </Flex>
      {/* Mobile map tools: basemap selector only (area tools live in AreasPanel). */}
      <Flex hideFrom="md" gap={2} align="flex-end" flexDirection="column">
        <MapAreaFeedbackMobile />
        <Flex gap={2} align="flex-end">
          <Button
            position="relative"
            variant="subtle"
            size="xs"
            bg={showTools ? "bg.muted" : "bg"}
            _active={{ bg: "bg.muted" }}
            flexDirection="column"
            h="auto"
            px={3}
            py={1}
            bottom={1}
            color="fg.muted"
            gap={0}
            lineHeight="0.875rem"
            zIndex={500}
            pointerEvents="all"
            onClick={() => setShowTools((prev) => !prev)}
          >
            {!showTools ? <MapTrifoldIcon /> : <XIcon />}
            Tools
          </Button>
          <BasemapSelector
            currentBasemap={basemapTiles}
            onBasemapChange={setBasemapTiles}
            display={showTools ? "inherit" : "none"}
          />
        </Flex>
      </Flex>
      {/* Draw-complete confirm controls, anchored to the just-drawn shape.
          Selection-mode banner and validation errors now live in
          MapAreaFeedback / MapAreaFeedbackMobile. */}
      {pendingDrawnArea && (
        <PendingDrawControls
          name={pendingDrawnArea.name}
          bbox={pendingDrawnArea.bbox}
          isConfirming={isCreating}
          onConfirm={handleConfirmDrawing}
          onCancel={cancelDrawing}
        />
      )}
    </Wrapper>
  );
}

interface PendingDrawControlsProps {
  name: string | null;
  bbox: [number, number, number, number];
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirm/cancel controls and the area-name label, anchored to the top-left
 * corner of a just-completed drawn shape. The label shows a loading state
 * ("Drawn shape" + spinner) until the name resolves, then the resolved name.
 */
function PendingDrawControls({
  name,
  bbox,
  isConfirming,
  onConfirm,
  onCancel,
}: PendingDrawControlsProps) {
  // A null name means the name is still being fetched.
  const isResolvingName = name === null;
  return (
    <Marker longitude={bbox[0]} latitude={bbox[3]} anchor="bottom-left">
      <Flex direction="column" align="flex-start" gap={1}>
        {/* Same button styling as the original draw controls (subtle group,
            bg surface with muted hover). */}
        <ButtonGroup size="sm" variant="subtle" pointerEvents="initial">
          <Tooltip content="Cancel drawing" positioning={{ placement: "top" }}>
            <IconButton
              bg="bg"
              _hover={{ bg: "bg.muted" }}
              aria-label="Cancel drawing"
              onClick={onCancel}
            >
              <XIcon />
            </IconButton>
          </Tooltip>
          {/* Confirm is shown but disabled until the area name has resolved. */}
          <Tooltip content="Confirm area" positioning={{ placement: "top" }}>
            <IconButton
              bg="bg"
              _hover={{ bg: "bg.muted" }}
              aria-label="Confirm area"
              onClick={onConfirm}
              disabled={isResolvingName || isConfirming}
            >
              <CheckIcon />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
        {/* Label matches a selected AOI's chip in GeoJsonLayers. */}
        <Tag.Root
          colorPalette="primary"
          variant="solid"
          size="md"
          px={2}
          py={1}
          roundedBottom="none"
          maxW="14rem"
          pointerEvents="initial"
        >
          <Tag.StartElement>
            {isResolvingName ? (
              <Spinner size="xs" />
            ) : (
              ChatContextOptions.area.icon
            )}
          </Tag.StartElement>
          <Tag.Label fontWeight="medium">{name ?? "Drawn shape"}</Tag.Label>
        </Tag.Root>
      </Flex>
    </Marker>
  );
}

export default MapAreaControls;
