import { Box, Button, Flex, IconButton, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";

import type { Dashboard } from "../api/schemas";
import { useDashboardAlertsSummary } from "../hooks/useDashboardAlertsSummary";
import { useDismissedAlertsWeek } from "../hooks/useDismissedAlertsWeek";
import { useIntegratedAlertsFreshness } from "../hooks/useIntegratedAlertsFreshness";
import {
  alertsStripAction,
  formatAlertArea,
  formatDataUpdated,
  formatPeriodRange,
  type AlertsSummary,
} from "../lib/alerts-summary";
import { NRT_MONITORING } from "../lib/alertsChart";
import { firstAlertsWidgetId } from "../lib/widgets";
import { useAnalysisTemplates } from "./dashboardQueries";
import { scrollToWidgetWhenRendered } from "./scrollToSection";
import {
  useApplyAnalysisTemplate,
  usePendingAnalysisTemplates,
} from "./useApplyAnalysisTemplate";

const ACTION_BUTTON_PROPS = {
  size: "xs",
  variant: "outline",
  bg: "white",
  color: "#B91C1C",
  borderColor: "#F8BABA",
  flexShrink: 0,
  _hover: { bg: "#FEE2E2" },
} as const;

/**
 * The Figma "Weekly alerts strip" (Playground 4549:3571): a red notice under
 * the dashboard title when the area had integrated alerts in the summary's
 * period: "142 ha of new integrated alerts, Nov 7–13 · Data updated Nov 15".
 * The period is counted back from the newest alert; the data updated date
 * says when GNW last got new alerts data, which is about weekly. Dismissing
 * hides the strip for that period; it returns with the next one.
 */
export default function WeeklyAlertsStrip({
  dashboard,
  isOwner,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
}) {
  const { data: summary } = useDashboardAlertsSummary([dashboard.id]);
  const [dismissedWeek, dismiss] = useDismissedAlertsWeek(dashboard.id);

  const areaHa: number | undefined = summary?.newAlertAreaHa[dashboard.id];
  if (!summary || areaHa === undefined || dismissedWeek === summary.endDate) {
    return null;
  }

  return (
    <AlertsNotice
      dashboard={dashboard}
      isOwner={isOwner}
      summary={summary}
      areaHa={areaHa}
      onDismiss={() => dismiss(summary.endDate)}
    />
  );
}

/**
 * The strip itself, mounted only once there is something to announce, so a
 * dashboard without alerts costs no freshness or template registry request.
 *
 * It ends on the alerts list: a View button that scrolls to the first one on
 * screen, or, for an owner whose dashboard has none, an Add button that
 * applies the Near real-time monitoring template (`useApplyAnalysisTemplate`
 * shows its toasts and scrolls to the new section). Once the template's
 * widgets reach the cache the same render offers View instead.
 */
function AlertsNotice({
  dashboard,
  isOwner,
  summary,
  areaHa,
  onDismiss,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  summary: AlertsSummary;
  areaHa: number;
  onDismiss: () => void;
}) {
  const { data: freshness } = useIntegratedAlertsFreshness();
  const alertsWidgetId = firstAlertsWidgetId(dashboard);
  // The template uses the dashboard's first area; without one it would fail.
  const canAdd = isOwner && dashboard.aois.length > 0;
  const { data: templates } = useAnalysisTemplates(canAdd && !alertsWidgetId);
  const apply = useApplyAnalysisTemplate(dashboard.id);
  const pendingTemplates = usePendingAnalysisTemplates(dashboard.id);
  const action = alertsStripAction({
    alertsWidgetId,
    canAdd,
    templateNames: templates?.map((template) => template.name),
    pendingTemplates,
  });

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
          {`${formatAlertArea(areaHa)} of new integrated alerts, ${formatPeriodRange(summary.startDate, summary.endDate)}`}
        </Text>
        {freshness && (
          <Text fontSize="13px" color="#565E7B">
            {`· ${formatDataUpdated(freshness.updatedOn, summary.endDate)}`}
          </Text>
        )}
      </Flex>
      {action.kind === "view" && (
        <Button
          {...ACTION_BUTTON_PROPS}
          onClick={() => scrollToWidgetWhenRendered(action.widgetId)}
        >
          View alerts list
        </Button>
      )}
      {action.kind === "add" && (
        <Button
          {...ACTION_BUTTON_PROPS}
          disabled={action.state !== "idle"}
          onClick={() => apply.mutate(NRT_MONITORING)}
        >
          {action.state === "adding" ? "Adding…" : "Add alerts list"}
        </Button>
      )}
      <IconButton
        aria-label="Dismiss alerts notice"
        size="xs"
        variant="ghost"
        color="#B91C1C"
        minW="28px"
        h="28px"
        _hover={{ bg: "#FEE2E2" }}
        onClick={onDismiss}
      >
        <XIcon size={16} />
      </IconButton>
    </Flex>
  );
}
