import { useEffect } from "react";
import {
  Box,
  type BoxProps,
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
  SelectionPlusIcon,
  UploadSimpleIcon,
  XIcon,
  CheckIcon,
} from "@phosphor-icons/react";

import { LayerId, selectLayerOptions } from "../types/map";
import useMapStore from "../store/mapStore";
import { Tooltip } from "./ui/tooltip";
import { MAX_AREA_KM2, MIN_AREA_KM2 } from "../constants/custom-areas";
import { formatAreaWithUnits } from "../utils/formatArea";
import { useCustomAreas } from "../hooks/useCustomAreas";

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
      gap={2}
      width="100%"
      height="100%"
      pointerEvents="none"
      justifyContent="flex-start"
      alignItems="center"
      zIndex={100}
      borderWidth="4px"
      {...props}
    >
      {children}
    </Box>
  );
}

function MapAreaControls() {
  const {
    setSelectAreaLayer,
    isDrawingMode,
    startDrawing,
    selectionMode,
    setSelectionMode,
    clearSelectionMode,
    cancelDrawing,
    confirmDrawing,
    toggleUploadAreaDialog,
  } = useMapStore();

  const { createArea, isCreating } = useCustomAreas();

  const handleConfirmDrawing = async () => {
    confirmDrawing();

    const fixedArea = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            coordinates: [
              [
                [-54.067785341147925, 0.6429207538929234],
                [-54.067785341147925, 0.5293895678403828],
                [-53.97489240245906, 0.5293895678403828],
                [-53.97489240245906, 0.6429207538929234],
                [-54.067785341147925, 0.6429207538929234],
              ],
            ],
            type: "Polygon",
          },
        },
      ],
    };

    const requestData = {
      name: "Test Area",
      geometry: {
        type: "Polygon",
        coordinates: fixedArea.features[0].geometry.coordinates,
      },
    };

    createArea(requestData);
  };

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
    <Wrapper borderColor={selectionMode ? "lime.400" : "transparent"}>
      <ButtonGroup size="sm" variant="subtle" pointerEvents="initial">
        {isDrawingMode ? (
          <>
            <Tooltip content="Cancel drawing">
              <IconButton
                bg="bg"
                _hover={{ bg: "bg.emphasized" }}
                aria-label="Cancel drawing"
                onClick={cancelDrawing}
              >
                <XIcon />
              </IconButton>
            </Tooltip>
            <Tooltip content="Confirm area">
              <IconButton
                bg="bg"
                _hover={{ bg: "bg.emphasized" }}
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
                _hover={{ bg: "bg.emphasized" }}
                onClick={() => {
                  toggleUploadAreaDialog();
                  setSelectionMode({ type: "Uploading", name: undefined });
                }}
              >
                <UploadSimpleIcon />
              </IconButton>
            </Tooltip>
            <ButtonGroup attached variant="subtle" size="sm">
              <IconButton
                bg="bg"
                _hover={{ bg: "bg.emphasized" }}
                aria-label="Select area on map"
              >
                <HandPointingIcon />
              </IconButton>
              <Menu.Root
                positioning={{ placement: "bottom-end" }}
                onSelect={({ value }) => setSelectAreaLayer(value as LayerId)}
              >
                <Menu.Trigger asChild>
                  <IconButton
                    minW="0"
                    px={1}
                    borderLeftRadius={0}
                    bg="bg"
                    _hover={{ bg: "bg.emphasized" }}
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
                          onClick={() =>
                            setSelectionMode({ type: "Selecting", name: name })
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
            <IconButton
              bg="bg"
              _hover={{ bg: "bg.emphasized" }}
              aria-label="Draw area bounds"
              onClick={() => {
                startDrawing();
                setSelectionMode({ type: "Drawing", name: undefined });
              }}
              data-active={isDrawingMode}
            >
              <SelectionPlusIcon />
            </IconButton>
          </>
        )}
      </ButtonGroup>
      {selectionMode && (
        <Box
          px={3}
          py={1}
          bg="bg"
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
