import { useEffect, useState } from "react";
import { Box, type BoxProps, Button, Flex, IconButton } from "@chakra-ui/react";
import {
  MinusIcon,
  PlusIcon,
  XIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react";

import useMapStore from "../store/mapStore";
import { Tooltip } from "./ui/tooltip";
import { BasemapSelector } from "./map/BasemapSelector";
import { ScaleBar } from "./map/ScaleBar";
import useSidebarStore from "../store/sidebarStore";
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
    selectionMode,
    clearSelectionMode,
    cancelDrawing,
    mapRef,
  } = useMapStore();
  const { isChatFullSize, dataCatalogOpen, areasPanelOpen } = useSidebarStore();
  const catalogColumnOpen = dataCatalogOpen || areasPanelOpen;
  const mapControlsLeft = `${getMapControlsLeftPx(isChatFullSize, catalogColumnOpen)}px`;

  const [showTools, setShowTools] = useState(false);

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
    </Wrapper>
  );
}

export default MapAreaControls;
