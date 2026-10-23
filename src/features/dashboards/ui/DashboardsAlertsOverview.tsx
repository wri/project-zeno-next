import { Box, Flex, Skeleton, Text } from "@chakra-ui/react";

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
 * how current the integrated alerts data is. Shimmers while either loads, so
 * the row never looks absent. Silent when the backend could assess no
 * dashboard. When the period starts after the latest detection (the data has
 * stalled, or the backend fell back to a calendar week) it says none were
 * detected yet, since a count of zero would then be a false reassurance.
 */
export default function DashboardsAlertsOverview({
  summary,
  dashboardIds,
  freshness,
  loading,
}: {
  summary: AlertsSummary | undefined;
  dashboardIds: string[];
  /**
   * From the analytics API rather than the summary. Undefined when it failed:
   * the count then shows as is and the right-hand line is left out.
   */
  freshness: AlertsFreshness | undefined;
  /**
   * The list, the summary or the dates are still on their way. The left-hand
   * text waits for all, so "0 of n" never flashes before "No alerts detected".
   */
  loading: boolean;
}) {
  if (loading) {
    // Widths roughly those of the text each bar stands in for.
    return (
      <Flex
        mt="8px"
        minH={LINE_HEIGHT}
        justify="space-between"
        align="center"
        gap={4}
        wrap="wrap"
      >
        <Skeleton h="14px" w="380px" maxW="100%" />
        <Skeleton h="12px" w="320px" maxW="100%" />
      </Flex>
    );
  }

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
        {freshness &&
        countWithNewAlerts(summary, dashboardIds) === 0 &&
        awaitingPeriodData(summary.startDate, freshness)
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
