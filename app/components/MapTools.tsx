import { Button, Menu, Portal } from "@chakra-ui/react";
import { CaretDownIcon, HandPointingIcon } from "@phosphor-icons/react";

function MapTools() {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="xs" variant="outline" bgColor="white" aria-label="Select layer">
          <HandPointingIcon />
          <CaretDownIcon />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="new-txt-a">
              Administrative Areas
            </Menu.Item>
            <Menu.Item value="new-txt-b">
              Key Biodiversity Areas
            </Menu.Item>
            <Menu.Item value="new-txt-c">
              Indigenous Lands
            </Menu.Item>
            <Menu.Item value="new-txt-d">
              Protected Areas
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

export default MapTools;
