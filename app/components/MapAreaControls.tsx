import { useEffect } from "react";
import {
  Box,
  type BoxProps,
  ButtonGroup,
  IconButton,
  Menu,
  Portal,
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
    validationError,
  } = useMapStore();

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
                onClick={confirmDrawing}
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
      {validationError && (
        <Box
          px={3}
          py={2}
          bg="red.50"
          borderColor="red.200"
          borderWidth="1px"
          borderRadius="sm"
          boxShadow="sm"
          color="red.700"
          fontSize="sm"
        >
          <Box fontWeight="bold" mb={1}>
            {validationError.code === "too-small"
              ? "Area is too small"
              : "Area is too large"}
          </Box>
          <Box fontSize="xs">
            Your area: {validationError.area.toLocaleString()} km²
            <br />
            Valid range: {MIN_AREA_KM2.toLocaleString()} -{" "}
            {MAX_AREA_KM2.toLocaleString()} km²
          </Box>
        </Box>
      )}
    </Wrapper>
  );
}

export default MapAreaControls;
