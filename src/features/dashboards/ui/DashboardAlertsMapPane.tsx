import { useState } from "react";
import { Box, IconButton } from "@chakra-ui/react";
import { ArrowsOutIcon } from "@phosphor-icons/react";

import type { MapAreaAoi, MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapFullscreenDialog from "./DashboardMapFullscreenDialog";
import DashboardMapWidget from "./DashboardMapWidget";

/**
 * The map pane of the alerts widget: the alerts layer, already dated to the
 * period the list pane shows. No header of its own, so the list and the map line up
 * at the top; the full-screen control sits inside the map, top right, as on
 * the map page, and owns the dialog.
 */
export default function DashboardAlertsMapPane({
  title,
  layer,
  aoi,
  tall,
}: {
  /** The widget title, for the full-screen dialog. */
  title: string;
  layer: MapWidgetLayer;
  aoi: MapAreaAoi | undefined;
  tall: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <Box position="relative" minW={0}>
      <DashboardMapWidget layer={layer} aoi={aoi} tall={tall} />
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
