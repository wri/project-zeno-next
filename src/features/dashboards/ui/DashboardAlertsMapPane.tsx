import { useState } from "react";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { ArrowsOutIcon } from "@phosphor-icons/react";

import type { DateRange } from "../lib/alertsWidgets";
import type { MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapFullscreenDialog from "./DashboardMapFullscreenDialog";
import DashboardMapWidget from "./DashboardMapWidget";

/**
 * The map pane of the alerts widget: the alerts layer drawn for the period
 * the list pane shows, under a pane header of its own with the full-screen
 * button (the shell's header has none, since the shell holds two panes).
 */
export default function DashboardAlertsMapPane({
  title,
  layer,
  aoi,
  dateRange,
  tall,
}: {
  /** The widget title; the pane reads "{title} · map". */
  title: string;
  layer: MapWidgetLayer;
  aoi: { source: string; src_id: string; name: string } | undefined;
  /** The period on show; undefined before the first response (the snapshot's own). */
  dateRange: DateRange | undefined;
  tall: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const paneTitle = `${title} · map`;

  return (
    <Flex direction="column" gap="4px" minW={0}>
      <Flex align="center" gap="4px" pl="4px">
        <Text
          flex="1"
          minW={0}
          fontSize="12px"
          fontWeight="medium"
          lineHeight="16px"
          color="#172B7A"
          wordBreak="break-word"
        >
          {paneTitle}
        </Text>
        <IconButton
          aria-label="View map full screen"
          title="View map full screen"
          size="2xs"
          variant="ghost"
          color="fg.muted"
          flexShrink={0}
          onClick={() => setFullscreen(true)}
        >
          <ArrowsOutIcon size={16} />
        </IconButton>
      </Flex>
      <DashboardMapWidget
        layer={layer}
        aoi={aoi}
        bboxOverride={null}
        dateRange={dateRange}
        tall={tall}
      />
      <DashboardMapFullscreenDialog
        open={fullscreen}
        onOpenChange={setFullscreen}
        title={paneTitle}
        layer={layer}
        aoi={aoi}
        bboxOverride={null}
        dateRange={dateRange}
      />
    </Flex>
  );
}
