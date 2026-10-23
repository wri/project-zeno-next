import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";

import type { Dashboard } from "../api/schemas";
import { useDashboardAlertsSummary } from "../hooks/useDashboardAlertsSummary";
import { useDismissedAlertsWeek } from "../hooks/useDismissedAlertsWeek";
import { formatAlertArea, updatableChartsLabel } from "../lib/alerts-summary";
import { countIntegratedAlertsCharts } from "../lib/widgets";

/**
 * The Figma "Weekly alerts strip" (Playground 4549:3571): a red notice under
 * the dashboard title when the area had integrated alerts in the latest full
 * alert week, followed by a nudge: "· 2 charts can be updated. Ask the
 * assistant to update a chart". The design's per-chart Update control and
 * its "ask Zeno" link are deliberately not built yet, so the nudge is plain
 * text. Dismissing hides the strip for that week; it returns with the next
 * week's data.
 */
export default function WeeklyAlertsStrip({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const { data: summary } = useDashboardAlertsSummary([dashboard.id]);
  const [dismissedWeek, dismiss] = useDismissedAlertsWeek(dashboard.id);

  const areaHa: number | undefined = summary?.newAlertAreaHa[dashboard.id];
  if (!summary || areaHa === undefined || dismissedWeek === summary.endDate) {
    return null;
  }

  return (
    <Flex
      role="status"
      align="center"
      gap="12px"
      px="16px"
      py="8px"
      bg="#FEF2F2"
      borderWidth="1px"
      borderColor="#F8BABA"
      rounded="8px"
    >
      <Box
        aria-hidden
        flexShrink={0}
        boxSize="8px"
        rounded="full"
        bg="#EF4444"
      />
      <Flex flex="1" minW={0} align="center" gap="12px" wrap="wrap">
        <Text fontSize="14px" fontWeight="medium" color="#B91C1C">
          {formatAlertArea(areaHa)} of new integrated alerts
        </Text>
        <Text fontSize="13px" color="#565E7B">
          ·{" "}
          {updatableChartsLabel(countIntegratedAlertsCharts(dashboard.widgets))}{" "}
          Ask the assistant to{" "}
          <Text as="span" fontWeight="semibold">
            update a chart
          </Text>
        </Text>
      </Flex>
      <IconButton
        aria-label="Dismiss alerts notice"
        size="xs"
        variant="ghost"
        color="#B91C1C"
        minW="28px"
        h="28px"
        _hover={{ bg: "#FEE2E2" }}
        onClick={() => dismiss(summary.endDate)}
      >
        <XIcon size={16} />
      </IconButton>
    </Flex>
  );
}
