import { useState } from "react";
import { Box, IconButton } from "@chakra-ui/react";
import { ArrowsOutIcon } from "@phosphor-icons/react";

import type { MapAreaAoi, MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapFullscreenDialog from "./DashboardMapFullscreenDialog";
import DashboardMapWidget from "./DashboardMapWidget";

/**
 * The map pane of the alerts widget: the alerts layer, already dated to the
 * period the list pane shows. It fills the column the list gives it (beside
 * the table, or stacked under it), has no header of its own, and carries the
 * full-screen control inside the map, top right, as on the map page.
 */
export default function DashboardAlertsMapPane({
  title,
  layer,
  aoi,
}: {
  /** The widget title, for the full-screen dialog. */
  title: string;
  layer: MapWidgetLayer;
  aoi: MapAreaAoi | undefined;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <Box position="relative" h="100%" minW={0}>
      <DashboardMapWidget layer={layer} aoi={aoi} stretch />
      <IconButton
        aria-label="View map full screen"
        title="View map full screen"
        position="absolute"
        top="8px"
        right="8px"
        zIndex={1}
        size="xs"
        variant="outline"
        bg="white"
        borderColor="#DDE2F5"
        color="fg.muted"
        onClick={() => setFullscreen(true)}
      >
        <ArrowsOutIcon size={16} />
      </IconButton>
      <DashboardMapFullscreenDialog
        open={fullscreen}
        onOpenChange={setFullscreen}
        title={title}
        layer={layer}
        aoi={aoi}
      />
    </Box>
  );
}
