import { useEffect } from "react";
import { Box, ButtonGroup, IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  CaretDownIcon,
  HandPointingIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import { LayerId, selectLayerOptions } from "../types/map";
import useMapStore from "../store/mapStore";

function MapAreaControls() {
  const { setSelectAreaLayer, selectionMode, setSelectionMode } = useMapStore();

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
      borderColor={selectionMode ? "lime.400" : "transparent"}
    >
      <ButtonGroup size="sm" variant="subtle" pointerEvents="initial">
        <IconButton
          aria-label="Upload area"
          bg="bg"
          _hover={{ bg: "bg.emphasized" }}
          onClick={() =>
            setSelectionMode({ type: "Uploading", name: undefined })
          }
        >
          <UploadSimpleIcon />
        </IconButton>
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
            onSelect={({ value }) => {
              setSelectAreaLayer(value as LayerId);
              // setSelectionMode(undefined);
            }}
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
          onClick={() => setSelectionMode({ type: "Drawing", name: undefined })}
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
    </Box>
  );
}

export default MapAreaControls;
