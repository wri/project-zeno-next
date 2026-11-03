import type { ReactElement } from "react";
import { Popover, Portal, Text } from "@chakra-ui/react";

/**
 * The "Layer information" popover a legend's info button opens. The button is
 * the child, so each legend keeps its own button style.
 */
export function LayerInfoPopover({
  info,
  children,
}: {
  info: string;
  children: ReactElement;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="medium">
                Layer information
              </Popover.Title>
              <Text my="4">{info}</Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
