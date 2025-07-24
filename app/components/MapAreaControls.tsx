import { useEffect } from "react";
import { Box, type BoxProps, ButtonGroup, IconButton, Menu, Portal } from "@chakra-ui/react";
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
import useUploadStore from "../store/uploadAreaStore";
import { Tooltip } from "./ui/tooltip";

function Wrapper({ children, ...props }: { children: React.ReactNode } & BoxProps) {
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
  } = useMapStore();
  const { toggleUploadAreaDialog } = useUploadStore();

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectionMode(undefined);
      }
    };
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [setSelectionMode]);

  if (isDrawingMode) {
    return <DrawAreaControls />;
  }

  return (
    <Wrapper borderColor={selectionMode ? "lime.400" : "transparent" }>
      <ButtonGroup size="sm" variant="subtle" pointerEvents="initial">
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
    </Wrapper>
  );
}

export default MapAreaControls;

function DrawAreaControls() {
  const { cancelDrawing, confirmDrawing } = useMapStore();

  return (
    <Wrapper>
      <ButtonGroup size="sm" variant="subtle" pointerEvents="initial">
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
      </ButtonGroup>
    </Wrapper>
  );
}
