import type { ReactNode } from "react";
import { IconButton, Menu, Portal } from "@chakra-ui/react";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";

import { ENTITY_KINDS } from "@/src/shared/ui/entity-card";

/** Compact 16px icon styling shared by the area card title actions. */
export const areaActionIconProps = {
  variant: "ghost" as const,
  color: ENTITY_KINDS.area.color,
  boxSize: "16px",
  minW: "16px",
  maxW: "16px",
  minH: "16px",
  maxH: "16px",
  p: 0,
  css: {
    "& svg": {
      width: "16px",
      height: "16px",
    },
  },
};

/**
 * Kebab (⋮) menu shell for an area card's title actions: compact trigger,
 * portalled content, and the z-index override in one place — Chakra's default
 * dropdown z-index (1000) paints behind the exploration panel column
 * (CATALOG_COLUMN_Z_INDEX = 1095), so menus opening over the panel must sit
 * above it.
 */
export function AreaCardMenu({
  label,
  children,
}: {
  /** Accessible name for the trigger, e.g. `Actions for ${areaName}`. */
  label: string;
  /** The `Menu.Item`s to render. */
  children: ReactNode;
}) {
  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <IconButton
          aria-label={label}
          {...areaActionIconProps}
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVerticalIcon size={16} color={ENTITY_KINDS.area.color} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content zIndex={1500}>{children}</Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
