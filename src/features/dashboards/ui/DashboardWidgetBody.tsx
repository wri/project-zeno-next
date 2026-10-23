import { Box, Flex, Text } from "@chakra-ui/react";
import { ChartBarIcon } from "@phosphor-icons/react";

import WidgetMessage from "@/app/components/WidgetMessage";
import type { InsightWidget } from "@/app/types/chat";
import type { MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapWidget from "./DashboardMapWidget";

/**
 * What a dashboard widget shows under its title: the insight chart card, the
 * map, or placeholder copy when there is nothing to render. Shared by the
 * interactive card (`DashboardWidgetCard`) and the export's document
 * (`DashboardWidgetDocument`), so a new kind of body is added once.
 */
export default function DashboardWidgetBody({
  card,
  map,
  aoi,
  viewportBbox,
  placeholder,
  isDouble,
  print = false,
}: {
  /** The insight card to render, or null for a map/placeholder cell. */
  card: InsightWidget | null;
  /** The map layer to render for `widget_type: "map"` cells. */
  map?: MapWidgetLayer | null;
  /** The dashboard's area — outline, label + viewport fit for map cells. */
  aoi?: { source: string; src_id: string; name: string };
  /** Reserved `config.viewport` bbox override for map cells. */
  viewportBbox?: [number, number, number, number] | null;
  /** Placeholder copy when `card` is null (unsupported type / hidden insight). */
  placeholder: string | null;
  isDouble: boolean;
  /** The export rendering (see `DashboardWidgetsGrid`). */
  print?: boolean;
}) {
  if (placeholder) {
    return (
      <Flex
        flex="1"
        minH="160px"
        align="center"
        justify="center"
        direction="column"
        gap={2}
        color="fg.muted"
        px={6}
        textAlign="center"
      >
        <ChartBarIcon size={24} />
        <Text fontSize="sm">{placeholder}</Text>
      </Flex>
    );
  }

  const body = map ? (
    <DashboardMapWidget
      layer={map}
      aoi={aoi}
      bboxOverride={viewportBbox ?? null}
      tall={isDouble}
      print={print}
    />
  ) : (
    card && (
      <WidgetMessage
        widget={card}
        inWorkspace
        fullWidth={isDouble}
        print={print}
      />
    )
  );

  // The card insets its body from the shell; the document has no shell.
  return print ? (
    body
  ) : (
    <Box px="8px" pb="8px" flex="1" minW={0}>
      {body}
    </Box>
  );
}
