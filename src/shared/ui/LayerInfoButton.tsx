import { IconButton, Popover, Portal, Text } from "@chakra-ui/react";
import type { IconButtonProps } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

/**
 * The info button of a map legend, with the "Layer information" popover it
 * opens. `label` is the button's accessible name; the rest styles the button.
 */
export function LayerInfoButton({
  info,
  label,
  ...buttonProps
}: { info: string; label: string } & Omit<IconButtonProps, "aria-label">) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton aria-label={label} {...buttonProps}>
          <InfoIcon />
        </IconButton>
      </Popover.Trigger>
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
