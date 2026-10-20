import { Box, Flex, Text } from "@chakra-ui/react";

import { InfoTooltip } from "@/src/shared/ui/InfoTooltip";
import {
  countWithNewAlerts,
  formatCheckedAt,
  formatWeekRange,
  type AlertsSummary,
} from "../lib/alerts-summary";

/** The row's height, held whenever the row is silent so the cards never jump. */
const LINE_HEIGHT = "18px";

/**
 * The line under the "My dashboards" heading per the Figma cards list: how
 * many dashboards have new alerts for which week and, right-aligned, when
 * the alerts were checked. Silent while the summary loads and when the
 * backend could assess no dashboard, since a count of zero would then be a
 * false reassurance.
 *
 * The design labels the right-hand line "Integrated alerts last updated …",
 * the dataset's own timestamp. The summary endpoint carries no such field
 * yet, so this shows when the summary was fetched, and says so on hover.
 */
export default function DashboardsAlertsOverview({
  summary,
  dashboardIds,
  checkedAt,
}: {
  summary: AlertsSummary | undefined;
  dashboardIds: string[];
  /**
   * Epoch ms of the fetch that produced `summary` (TanStack's
   * `dataUpdatedAt`). Undefined while `summary` is held over from a previous
   * set of dashboards: that check did not cover the set on the page, and
   * TanStack reports 0 for it, so the line is left out until the new one lands.
   */
  checkedAt: number | undefined;
}) {
  if (!summary || summary.assessedCount === 0) {
    return <Box mt="8px" minH={LINE_HEIGHT} />;
  }

  const total = dashboardIds.length;
  const withAlerts = countWithNewAlerts(summary, dashboardIds);

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
        {withAlerts} of {total}{" "}
        {total === 1 ? "dashboard has" : "dashboards have"} new alerts for the
        week of {formatWeekRange(summary.startDate, summary.endDate)}
      </Text>
      {checkedAt !== undefined && (
        <Flex align="center" gap="4px" color="#656E7B">
          <InfoTooltip about="the alerts check">
            When this summary was last fetched, not when the integrated alerts
            dataset was last updated.
          </InfoTooltip>
          <Text fontFamily="mono" fontSize="12px" lineHeight="16px">
            Integrated alerts checked {formatCheckedAt(checkedAt)}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
