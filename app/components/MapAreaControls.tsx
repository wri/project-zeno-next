import { useEffect, useState } from "react";
import {
  Box,
  type BoxProps,
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  HandPointingIcon,
  MinusIcon,
  PlusIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
  XIcon,
  CheckIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react";

import { LayerId, selectLayerOptions } from "../types/map";
import useMapStore from "../store/mapStore";
import { Tooltip } from "./ui/tooltip";
import { MAX_AREA_KM2, MIN_AREA_KM2 } from "../constants/custom-areas";
import { formatAreaWithUnits } from "../utils/formatArea";
import { useCustomAreasCreate } from "../hooks/useCustomAreasCreate";
import { BasemapSelector } from "./map/BasemapSelector";
import { ScaleBar } from "./map/ScaleBar";
import useSidebarStore from "../store/sidebarStore";
import { FeatureRef } from "../store/layerManagerSlice";

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
    selectAreaLayer,
    setSelectAreaLayer,
    isDrawingMode,
    startDrawing,
    selectionMode,
    setSelectionMode,
    clearSelectionMode,
    cancelDrawing,
    confirmDrawing,
    toggleUploadAreaDialog,
    setCreateAreaFn,
    addLayer,
    addToRegistry,
    flyToGeoJson,
    mapRef,
  } = useMapStore();
  const { isChatFullSize } = useSidebarStore();

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
      // The visible layer IS the scope — no separate context item.
      addLayer({
        id: featureRef.name,
        name: featureRef.name,
        type: "geojson",
        visible: true,
        featureRefs: [featureRef],
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
        left={{ base: 2, md: isChatFullSize ? "436px" : "416px" }}
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
      {/* Area tools: in full-size mode, anchor just right of the chat panel
          (aligned with the zoom/basemap controls above); otherwise top-left. */}
      <Flex ml={{ base: 0, md: isChatFullSize ? "436px" : 0 }}>
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
          hideFrom="md"
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
          display={{ base: showTools ? "inherit" : "none", md: "none" }}
        />
        <ButtonGroup
          size="sm"
          variant="subtle"
          pointerEvents="initial"
          display={{ base: showTools ? "inherit" : "none", md: "inherit" }}
          ml={{ base: 2, md: 0 }}
          bottom={{ base: 1, md: "initial" }}
          align="center"
        >
          {isDrawingMode ? (
            <>
              <Tooltip content="Cancel drawing">
                <IconButton
                  bg="bg"
                  _hover={{ bg: "bg.muted" }}
                  aria-label="Cancel drawing"
                  onClick={cancelDrawing}
                >
                  <XIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Confirm area">
                <IconButton
                  bg="bg"
                  _hover={{ bg: "bg.muted" }}
                  aria-label="Confirm area"
                  onClick={handleConfirmDrawing}
                  disabled={isCreating}
                >
                  <CheckIcon />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip content="Upload area from file">
                <IconButton
                  aria-label="Upload area"
                  bg="bg"
                  _hover={{ bg: "bg.muted" }}
                  onClick={() => {
                    toggleUploadAreaDialog();
                    setSelectionMode({ type: "Uploading", name: undefined });
                  }}
                  opacity={{ base: 0, md: 1 }}
                  key="1"
                  animation={{
                    base: "0.16s ease-out 1 forwards slide-from-left-full, 0.24s ease-out 1 forwards fade-in",
                    md: "none",
                  }}
                  zIndex={10}
                >
                  <UploadSimpleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Select area on map">
                <ButtonGroup
                  attached
                  variant="subtle"
                  size="sm"
                  opacity={{ base: 0, md: 1 }}
                  key="2"
                  animation={{
                    base: "0.16s 0.0625s ease-out 1 forwards slide-from-left-full, 0.24s 0.0625s ease-out 1 forwards fade-in",
                    md: "none",
                  }}
                  zIndex={20}
                >
                  <IconButton
                    bg="bg"
                    _hover={{ bg: "bg.muted" }}
                    aria-label="Select area on map"
                  >
                    <HandPointingIcon />
                  </IconButton>
                  <Menu.Root
                    positioning={{ placement: "bottom-end" }}
                    onSelect={({ value }) =>
                      setSelectAreaLayer(value as LayerId)
                    }
                  >
                    <Menu.Trigger asChild>
                      <IconButton
                        minW="0"
                        px={1}
                        borderLeftRadius={0}
                        bg="bg"
                        _hover={{ bg: "bg.muted" }}
                        aria-label="Select area from options"
                      >
                        <CaretDownIcon />
                      </IconButton>
                    </Menu.Trigger>
                    <Portal>
                      <Menu.Positioner>
                        <Menu.Content>
                          {selectLayerOptions.map(({ id, name }) => (
                            <Menu.Item
                              key={id}
                              value={id}
                              disabled={id === selectAreaLayer}
                              onClick={() =>
                                setSelectionMode({
                                  type: "Selecting",
                                  name: name,
                                })
                              }
                            >
                              {name}
                            </Menu.Item>
                          ))}
                        </Menu.Content>
                      </Menu.Positioner>
                    </Portal>
                  </Menu.Root>
                </ButtonGroup>
              </Tooltip>
              <Tooltip content="Draw area on map">
                <IconButton
                  bg="bg"
                  _hover={{ bg: "bg.muted" }}
                  aria-label="Draw area bounds"
                  onClick={() => {
                    startDrawing();
                    setSelectionMode({ type: "Drawing", name: undefined });
                  }}
                  data-active={isDrawingMode}
                  opacity={{ base: 0, md: 1 }}
                  key="3"
                  animation={{
                    base: "0.16s 0.125s ease-out 1 forwards slide-from-left-full, 0.24s 0.125s ease-out 1 forwards fade-in",
                    md: "none",
                  }}
                  zIndex={30}
                >
                  <SelectionPlusIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </ButtonGroup>
      </Flex>
      {selectionMode && (
        <Box
          px={3}
          py={1}
          bg="bg"
          order={{ base: -1, md: "initial" }}
          borderRadius="md"
          boxShadow="sm"
          color="blackAlpha.700"
        >
          {selectionMode.type}{" "}
          {selectionMode.type === "Selecting" ? selectionMode.name : "AOI"}
        </Box>
      )}
      <ValidationErrorDisplay />
    </Wrapper>
  );
}

export default MapAreaControls;

function ValidationErrorDisplay() {
  const { validationError, clearValidationError } = useMapStore();

  if (!validationError) return null;
  return (
    <Box
      px={3}
      py={2}
      bg="bg"
      minW="14rem"
      borderColor="red.muted"
      borderWidth="1px"
      borderRadius="md"
      boxShadow="sm"
      position="relative"
      order={{ base: -1, md: "initial" }}
    >
      <Tooltip content="Close area validation error">
        <IconButton
          position="absolute"
          colorPalette="red"
          variant="ghost"
          top={1}
          right={1}
          size="xs"
          h="initial"
          minW="initial"
          aria-label="Close validation error"
          onClick={clearValidationError}
          pointerEvents="auto"
        >
          <XIcon size={10} />
        </IconButton>
      </Tooltip>
      <Text fontWeight="semibold" fontSize="sm" mb={1}>
        {validationError.code === "too-small"
          ? "Error: Area too small"
          : "Error: Area too large"}
      </Text>
      <Flex fontSize="xs" color="fg.muted" justifyContent="space-between">
        <Text>
          {validationError.code === "too-small" ? "Minimum" : "Maximum"} area
        </Text>
        <Text>
          {validationError.code === "too-small"
            ? formatAreaWithUnits(MIN_AREA_KM2)
            : formatAreaWithUnits(MAX_AREA_KM2)}
        </Text>
      </Flex>
      <Flex fontSize="xs" color="fg.muted" justifyContent="space-between">
        <Text>Your area</Text>
        <Text>{formatAreaWithUnits(validationError.area)}</Text>
      </Flex>
    </Box>
  );
}
