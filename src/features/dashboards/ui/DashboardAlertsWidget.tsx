import { useEffect, useMemo, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import { ParamChip } from "@/app/components/ui/ParamChip";
import AnalysisParametersToggle from "@/app/components/widgets/AnalysisParameters";
import { fetchAlertsList, type AlertsListError } from "../api/alerts";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import { dashboardKeys } from "../hooks/dashboardKeys";
import {
  alertsMapLayer,
  alertsWidgetSpec,
  chipRange,
  confidenceLabel,
  customStartMin,
  formatLatest,
  initialWindow,
  needsWiderWindow,
  newWeekHa,
  rowsInRange,
  todayIso,
  visibleRows,
  widenedWindow,
  type AlertsChip,
  type AlertsConfidence,
  type AlertsLandFilter,
  type AlertsList,
  type AlertsWidgetSpec,
  type DateRange,
} from "../lib/alertsWidgets";
import DashboardAlertsList, {
  type AlertsListView,
} from "./DashboardAlertsList";
import DashboardAlertsMapPane from "./DashboardAlertsMapPane";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { TWO_COLUMN_QUERY } from "./gridLayout";

/** A list stays fresh for a few hours: the data moves once a day. */
const ALERTS_STALE_MS = 3 * 60 * 60 * 1000;

/**
 * How long a custom range must stand before the backend is asked for a
 * wider window. A date input commits on every keystroke, and the dates on
 * the way to "01/08/2026" ("01/09/2026", with last month's digits still in
 * place) are complete dates of their own; each would be an analytics job.
 */
const CUSTOM_FETCH_DEBOUNCE_MS = 400;

interface CardProps {
  areaAoi?: Dashboard["aois"][number];
  isOwner: boolean;
  isDouble: boolean;
  onArmDrag: (event: React.PointerEvent) => void;
  onToggleSize: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

/**
 * The `widget_type: "alerts"` card (PZB-1468, Stage 1): the live alerts list
 * beside the alerts map, in the one shell every widget draws. The two panes
 * share one date range — a chip or custom range in the list re-dates the
 * map's tiles — so both always show the same period.
 *
 * One fetch per view: the widget asks for its `days` window once, and the
 * chips filter the cached rows. A custom range reaching outside that window
 * or an Intersects land filter asks again, and then the rows on show stay
 * while the new list loads. Chips, confidence, land filter and the params
 * toggle are view state, never persisted.
 *
 * The config is parsed once (`alertsWidgetSpec`); a config that cannot be
 * rendered shows the shell with a placeholder, like a broken map widget.
 */
export default function DashboardAlertsWidget({
  widget,
  ...card
}: { widget: DashboardWidget } & CardProps) {
  const spec = useMemo(
    () => alertsWidgetSpec(widget.config, card.areaAoi?.name),
    [widget.config, card.areaAoi?.name]
  );

  if (!spec) {
    return (
      <DashboardWidgetCard
        title="Integrated alerts"
        card={null}
        placeholder="This alerts widget can't be displayed."
        removeMode="widget"
        isOwner={card.isOwner}
        isDouble={card.isDouble}
        onArmDrag={card.onArmDrag}
        onToggleSize={card.onToggleSize}
        onRemove={card.onRemove}
      />
    );
  }

  return <AlertsCard spec={spec} {...card} />;
}

function AlertsCard({
  spec,
  areaAoi,
  isOwner,
  isDouble,
  onArmDrag,
  onToggleSize,
  onRename,
  onRemove,
}: { spec: AlertsWidgetSpec } & CardProps) {
  const [chip, setChip] = useState<AlertsChip>("new-week");
  const [confidence, setConfidence] = useState<AlertsConfidence>("all");
  const [landFilter, setLandFilter] = useState<AlertsLandFilter>();
  const [custom, setCustom] = useState<DateRange>();
  const [paramsShown, setParamsShown] = useState(false);
  // The window asked of the backend. It starts as the widget's `days` ending
  // today and only ever widens, for a custom range that reaches outside it.
  const [requestWindow, setRequestWindow] = useState<DateRange>(() =>
    initialWindow(spec.days, todayIso())
  );

  const { aoi } = spec;
  const query = useQuery<AlertsList, AlertsListError>({
    queryKey: dashboardKeys.alerts(aoi, requestWindow, landFilter),
    queryFn: () => fetchAlertsList(aoi, requestWindow, landFilter),
    staleTime: ALERTS_STALE_MS,
    // A failed pull is a failed analytics job: retrying it blind would only
    // repeat the wait. The list offers a Retry button instead.
    retry: false,
  });

  // The last list that arrived, so the rows the user is reading stay on show
  // while another list loads (a wider window, a land filter) and when that
  // load fails (the list then shows the failure above them). Reconciled
  // during render, like the card's rename override.
  const [held, setHeld] = useState<AlertsList>();
  if (query.data && query.data !== held) setHeld(query.data);
  const list = query.data ?? held;
  const failure = query.error ?? undefined;

  const range = useMemo(
    () => (list ? chipRange(chip, list, custom) : undefined),
    [list, chip, custom]
  );
  const rows = useMemo(
    () =>
      list && range
        ? visibleRows(rowsInRange(list.rows, range), confidence)
        : [],
    [list, range, confidence]
  );
  const view: AlertsListView =
    list && range
      ? {
          kind: "ready",
          range,
          anchor: list.anchor,
          startMin: customStartMin(list.anchor),
          failure,
        }
      : failure
        ? { kind: "error", failure }
        : { kind: "loading" };

  const selectChip = (next: AlertsChip) => {
    if (!list) return;
    // The custom dates open on the last week, the widest preset, so there
    // is something to adjust from.
    if (next === "custom" && !custom) setCustom(chipRange("last-week", list));
    setChip(next);
  };

  const changeCustom = (next: DateRange) => {
    if (!list) return;
    // A date input reports every keystroke, so a year being typed passes
    // through "0002…" before "2026…": a bound outside the data (or beyond
    // the window the backend accepts) is left alone until it is inside.
    const min = customStartMin(list.anchor);
    const inData = (iso: string) => iso >= min && iso <= list.anchor;
    if (!inData(next.start) || !inData(next.end)) return;
    setCustom(next);
    setChip("custom");
  };

  // A custom range reaching outside the fetched window widens the request,
  // once the typing has paused: the rows already held filter to the range at
  // once, and the one fetch asks for where the user ended up.
  useEffect(() => {
    if (chip !== "custom" || !list || !range) return;
    if (!needsWiderWindow(range, list.window)) return;
    const timer = setTimeout(
      () => setRequestWindow((window) => widenedWindow(range, window)),
      CUSTOM_FETCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [chip, list, range]);

  const title = spec.title;

  return (
    <DashboardWidgetCard
      title={title}
      card={null}
      placeholder={null}
      removeMode="widget"
      isOwner={isOwner}
      isDouble={isDouble}
      onArmDrag={onArmDrag}
      onToggleSize={onToggleSize}
      onRename={onRename}
      onRemove={onRemove}
      body={
        <>
          {/* Badge row, as an analysis card's params row: the toggle, the
              badges once shown, and the latest alert day on the right (no
              label when the window has no alerts). */}
          <Box px="8px" pb="8px">
            <Flex
              borderTopWidth="1px"
              borderBottomWidth="1px"
              borderColor="rgba(19,22,25,0.05)"
              py="4px"
              align="center"
              gap="4px"
              wrap="wrap"
            >
              <AnalysisParametersToggle
                expanded={paramsShown}
                onToggle={() => setParamsShown((shown) => !shown)}
              />
              {paramsShown && (
                <>
                  <ParamChip
                    label="DATASET"
                    value="Integrated alerts"
                    colorScheme="blue"
                    bg="white"
                    maxValueWidth="20ch"
                  />
                  <ParamChip
                    label="CONFIDENCE"
                    value={confidenceLabel(confidence)}
                    colorScheme="blue"
                    bg="white"
                  />
                </>
              )}
              <Box flex="1" />
              {list?.latest && (
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  lineHeight="16px"
                  color="#565E7B"
                  whiteSpace="nowrap"
                >
                  LATEST {formatLatest(list.latest)}
                </Text>
              )}
            </Flex>
          </Box>

          {/* The two panes: side by side across a full-width card in a
              two-column grid, stacked otherwise (a single card, or a grid
              too narrow for two columns). */}
          <Box px="8px" pb="8px">
            <Flex
              direction="column"
              gap="12px"
              align="stretch"
              css={
                isDouble
                  ? {
                      [TWO_COLUMN_QUERY]: {
                        flexDirection: "row",
                        alignItems: "flex-start",
                      },
                    }
                  : undefined
              }
            >
              <Box flex="1 1 0" minW={0}>
                <DashboardAlertsList
                  view={view}
                  isFetching={query.isFetching && !!list}
                  rows={rows}
                  newWeekHa={list ? newWeekHa(list.rows, confidence) : 0}
                  chip={chip}
                  confidence={confidence}
                  landFilter={landFilter}
                  custom={custom}
                  onChip={selectChip}
                  onConfidence={setConfidence}
                  onLandFilter={setLandFilter}
                  onCustomChange={changeCustom}
                  onRetry={() => query.refetch()}
                />
              </Box>
              <Box flex="1 1 0" minW={0}>
                <DashboardAlertsMapPane
                  title={title}
                  layer={alertsMapLayer(spec, landFilter)}
                  aoi={areaAoi}
                  dateRange={range}
                  tall={isDouble}
                />
              </Box>
            </Flex>
          </Box>
        </>
      }
    />
  );
}
