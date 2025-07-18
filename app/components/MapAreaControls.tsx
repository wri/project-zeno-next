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
  const { setSelectAreaLayer } = useMapStore();

  return (
    <Box
      display="flex"
      position="absolute"
      top={2}
      gap={2}
      width="100%"
      justifyContent="center"
      zIndex={100}
    >
      <ButtonGroup size="sm" variant="subtle">
        <IconButton
          aria-label="Upload area"
          bg="bg"
          _hover={{ bg: "bg.emphasized" }}
        >
          <UploadSimpleIcon />
        </IconButton>
        <ButtonGroup
          attached
          variant="subtle"
          size="sm"
        >
          <IconButton
            bg="bg"
            _hover={{ bg: "bg.emphasized" }}
            aria-label="Select area on map"
          >
            <HandPointingIcon />
          </IconButton>
          <Menu.Root positioning={{ placement: "bottom-end" }} onSelect={({ value }) => setSelectAreaLayer(value as LayerId)}>
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
                    <Menu.Item key={id} value={id}>
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
        >
          <SelectionPlusIcon />
        </IconButton>
      </ButtonGroup>
    </Box>
  );
}

export default MapAreaControls;
