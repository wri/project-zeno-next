import { useMemo, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ParamChip } from "@/app/components/ui/ParamChip";
import { fetchAlertsList, toAlertsListError } from "../api/alerts";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import { dashboardKeys } from "../hooks/dashboardKeys";
import {
  alertsWidgetSpec,
  chipRange,
  customStartMin,
  formatDataTo,
  initialWindow,
  needsWiderWindow,
  newWeekHa,
  rowsInRange,
  todayIso,
  visibleRows,
  widenedWindow,
  type AlertsChip,
  type AlertsConfidence,
  type AlertsList,
  type AlertsWidgetSpec,
  type DateRange,
} from "../lib/alertsWidgets";
import DashboardAlertsList from "./DashboardAlertsList";
import DashboardAlertsMapPane from "./DashboardAlertsMapPane";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { TWO_COLUMN_QUERY } from "./gridLayout";

/** A list stays fresh for a few hours: the data moves once a day. */
const ALERTS_STALE_MS = 3 * 60 * 60 * 1000;

const CONFIDENCE_LABEL: Record<AlertsConfidence, string> = {
  all: "High · Highest",
  high: "High",
  highest: "Highest",
};

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
 * chips filter the cached rows. Only a custom range reaching outside that
 * window asks for more, and then the rows on show stay while the wider
 * window loads. Chips and confidence are view state, never persisted.
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
        title={
          typeof widget.config.title === "string"
            ? widget.config.title
            : "Integrated alerts"
        }
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
  const [custom, setCustom] = useState<DateRange | null>(null);
  // The window asked of the backend. It starts as the widget's `days` ending
  // today and only ever widens, for a custom range that reaches outside it.
  const [requestWindow, setRequestWindow] = useState<DateRange>(() =>
    initialWindow(spec.days, todayIso())
  );

  const { aoi } = spec;
  const query = useQuery({
    queryKey: dashboardKeys.alerts(
      aoi.source,
      aoi.srcId,
      aoi.subtype,
      requestWindow.start,
      requestWindow.end
    ),
    queryFn: () => fetchAlertsList(aoi, requestWindow),
    staleTime: ALERTS_STALE_MS,
    // A failed pull is a failed analytics job: retrying it blind would only
    // repeat the wait. The list offers a Retry button instead.
    retry: false,
    // A widened window replaces the rows on show only once it has landed.
    placeholderData: keepPreviousData,
  });

  // The last list that arrived. `keepPreviousData` carries the old rows only
  // while the wider window is loading; if that load fails the query has no
  // data, and the rows the user was reading would vanish behind the error.
  // Held here instead, so a failed wider fetch shows its failure above them.
  // Reconciled during render, like the card's rename override.
  const [held, setHeld] = useState<AlertsList | null>(null);
  if (query.data && query.data !== held) setHeld(query.data);
  const list = query.data ?? held;
  const status =
    query.status === "error" && !list ? "error" : list ? "ready" : "loading";
  const error = query.error ? toAlertsListError(query.error) : null;

  const range = useMemo(
    () => (list ? chipRange(chip, list, custom ?? undefined) : null),
    [list, chip, custom]
  );
  const rows = useMemo(
    () =>
      list && range
        ? visibleRows(rowsInRange(list.rows, range), confidence)
        : [],
    [list, range, confidence]
  );

  // Counts the times the Custom chip was opened: the date inputs are
  // uncontrolled (a controlled one would snap a half-typed year back on
  // every keystroke the handler ignores), so this key resets them to the
  // committed range each time they open.
  const [customSession, setCustomSession] = useState(0);

  const selectChip = (next: AlertsChip) => {
    if (next === "custom") {
      // The inputs open on the last week, the widest preset, so there is
      // something to adjust from.
      if (!custom && list) setCustom(chipRange("last-week", list));
      setCustomSession((session) => session + 1);
    }
    setChip(next);
  };

  const changeCustom = (next: DateRange) => {
    if (!list) return;
    // A date input reports every keystroke, so a year being typed passes
    // through "0002…" before "2026…": a bound outside the data (or beyond
    // the window the backend accepts) is left alone until it is inside.
    const min = customStartMin(list.dataTo);
    const inData = (iso: string) => iso >= min && iso <= list.dataTo;
    if (!inData(next.start) || !inData(next.end)) return;
    setCustom(next);
    setChip("custom");
    const resolved = chipRange("custom", list, next);
    if (needsWiderWindow(resolved, list.window)) {
      setRequestWindow((window) => widenedWindow(resolved, window));
    }
  };

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
          {/* Badge row, where an analysis card shows its params */}
          <Box px="8px" pb="8px">
            <Flex
              borderTopWidth="1px"
              borderColor="rgba(19,22,25,0.05)"
              pt="4px"
              align="center"
              gap="4px"
              wrap="wrap"
            >
              <ParamChip
                label="DATASET"
                value="Integrated alerts"
                colorScheme="blue"
                bg="white"
                maxValueWidth="20ch"
              />
              <ParamChip
                label="CONFIDENCE"
                value={CONFIDENCE_LABEL[confidence]}
                colorScheme="blue"
                bg="white"
              />
              <Box flex="1" />
              {list && (
                <Text
                  fontFamily="mono"
                  fontSize="10px"
                  lineHeight="16px"
                  color="#565E7B"
                  whiteSpace="nowrap"
                >
                  DATA TO {formatDataTo(list.dataTo)}
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
                  status={status}
                  error={error}
                  isFetching={query.isFetching && !!list}
                  rows={rows}
                  range={range}
                  dataTo={list?.dataTo ?? null}
                  newWeekHa={list ? newWeekHa(list.rows, confidence) : 0}
                  chip={chip}
                  confidence={confidence}
                  custom={custom}
                  customKey={customSession}
                  startMin={list ? customStartMin(list.dataTo) : null}
                  onChip={selectChip}
                  onConfidence={setConfidence}
                  onCustomChange={changeCustom}
                  onRetry={() => query.refetch()}
                />
              </Box>
              <Box flex="1 1 0" minW={0}>
                <DashboardAlertsMapPane
                  title={title}
                  layer={spec.layer}
                  aoi={areaAoi}
                  dateRange={range ?? undefined}
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
