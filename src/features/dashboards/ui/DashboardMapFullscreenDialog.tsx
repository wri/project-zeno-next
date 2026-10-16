import { CloseButton, Dialog, Portal } from "@chakra-ui/react";

import type { MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapWidget from "./DashboardMapWidget";

/**
 * A dashboard map at full screen: the same layer and area as the card it
 * came from, in a cover dialog that allows scroll-zoom. Shared by the map
 * widget card and the alerts widget's map pane, so the two full-screen
 * views cannot drift apart.
 *
 * Lazily mounted and unmounted on close, so a second MapLibre instance
 * exists only while the dialog is open.
 */
export default function DashboardMapFullscreenDialog({
  open,
  onOpenChange,
  title,
  layer,
  aoi,
  bboxOverride,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  layer: MapWidgetLayer;
  /** The dashboard's (single) area — outline, label + default viewport fit. */
  aoi: { source: string; src_id: string; name: string } | undefined;
  bboxOverride: [number, number, number, number] | null;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="cover"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p={4}>
            <Dialog.Header px={0} pt={0} pb={3}>
              <Dialog.Title fontSize="md" fontWeight="medium">
                {title}
              </Dialog.Title>
              <Dialog.CloseTrigger
                asChild
                position="absolute"
                top={3}
                right={3}
              >
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body p={0} flex="1" minH={0}>
              <DashboardMapWidget
                layer={layer}
                aoi={aoi}
                bboxOverride={bboxOverride}
                fill
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
