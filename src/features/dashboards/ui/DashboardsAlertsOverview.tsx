import { Box, Flex, Text } from "@chakra-ui/react";

import { InfoTooltip } from "@/src/shared/ui/InfoTooltip";
import {
  awaitingPeriodData,
  countWithNewAlerts,
  formatFreshness,
  formatPeriodRange,
  type AlertsFreshness,
  type AlertsSummary,
} from "../lib/alerts-summary";

/** The row's height, held whenever the row is silent so the cards never jump. */
const LINE_HEIGHT = "18px";

/**
 * The line under the "My dashboards" heading per the Figma cards list: how
 * many dashboards have new alerts detected over which days and, right-aligned,
 * how current the integrated alerts data is. Silent while the summary loads
 * and when the backend could assess no dashboard. When the period starts after
 * the latest detection (the data has stalled, or the backend fell back to a
 * calendar week) it says none were detected yet, since a count of zero would
 * then be a false reassurance.
 */
export default function DashboardsAlertsOverview({
  summary,
  dashboardIds,
  freshness,
}: {
  summary: AlertsSummary | undefined;
  dashboardIds: string[];
  /**
   * From the analytics API rather than the summary. Undefined while it loads
   * or when it failed: the count then shows as is and the right-hand line is
   * left out.
   */
  freshness: AlertsFreshness | undefined;
}) {
  if (!summary || summary.assessedCount === 0) {
    return <Box mt="8px" minH={LINE_HEIGHT} />;
  }

  const total = dashboardIds.length;
  const period = formatPeriodRange(summary.startDate, summary.endDate);

  return (
    <Flex
      mt="8px"
      minH={LINE_HEIGHT}
      justify="space-between"
      align="flex-end"
      gap={4}
      wrap="wrap"
    >
      <Text fontSize="14px" lineHeight={LINE_HEIGHT} color="#656E7B">
        {freshness && awaitingPeriodData(summary.startDate, freshness)
          ? `No alerts detected ${period} yet`
          : `${countWithNewAlerts(summary, dashboardIds)} of ${total} ${
              total === 1 ? "dashboard has" : "dashboards have"
            } new alerts detected ${period}`}
      </Text>
      {freshness && (
        <Flex align="center" gap="4px" color="#656E7B">
          <InfoTooltip about="the alerts data">
            Alerts are dated by when they were detected and reach Global Nature
            Watch a few days after that.
          </InfoTooltip>
          <Text fontFamily="mono" fontSize="12px" lineHeight="16px">
            {formatFreshness(freshness)}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
