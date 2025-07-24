import { Box, ButtonGroup, IconButton, Menu, Portal } from "@chakra-ui/react";
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

function Wrapper({ children }: { children: React.ReactNode }) {
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
      {children}
    </Box>
  );
}

function MapAreaControls() {
  const { setSelectAreaLayer, isDrawingMode, startDrawing, toggleUploadAreaDialog } = useMapStore();

  if (isDrawingMode) {
    return <DrawAreaControls />;
  }

  return (
    <Wrapper>
      <ButtonGroup size="sm" variant="subtle">
        <Tooltip content="Upload area from file">
          <IconButton
            aria-label="Upload area"
            bg="bg"
            _hover={{ bg: "bg.emphasized" }}
            onClick={toggleUploadAreaDialog}
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
          onClick={startDrawing}
          data-active={isDrawingMode}
        >
          <SelectionPlusIcon />
        </IconButton>
      </ButtonGroup>
    </Wrapper>
  );
}

export default MapAreaControls;

function DrawAreaControls() {
  const { cancelDrawing, confirmDrawing } = useMapStore();

  return (
    <Wrapper>
      <ButtonGroup size="sm" variant="subtle">
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
