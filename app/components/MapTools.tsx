import { Button, Menu, Portal } from "@chakra-ui/react";
import { CaretDownIcon, HandPointingIcon } from "@phosphor-icons/react";

import { LayerId, selectLayerOptions } from "../types/map";
import useMapStore from "@/app/store/mapStore";

function MapTools() {
  const { setSelectAreaLayer } = useMapStore();

  return (
    <Menu.Root onSelect={({ value }) => setSelectAreaLayer(value as LayerId)}>
      <Menu.Trigger asChild>
        <Button size="xs" variant="outline" bgColor="white" aria-label="Select layer">
          <HandPointingIcon />
          <CaretDownIcon />
        </Button>
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
  )
}

export default MapTools;
