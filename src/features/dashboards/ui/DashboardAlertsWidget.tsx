import { useEffect, useMemo, useState } from "react";
import { Box } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import {
  buildChips,
  type ParamChipData,
} from "@/app/components/widgets/analysis-params-utils";
import { downloadCsv } from "@/src/shared/lib/csv";
import { todayIso, type DateRange } from "@/src/shared/lib/iso-date";
import { fetchAlertsList, type AlertsListError } from "../api/alerts";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import { dashboardKeys } from "../hooks/dashboardKeys";
import {
  alertsCsv,
  alertsCsvFilename,
  alertsHeadline,
  alertsMapLayer,
  alertsWidgetSpec,
  chipRange,
  confidenceLabel,
  initialWindow,
  needsWiderWindow,
  rowsInRange,
  sinceRange,
  visibleRows,
  widenedWindow,
  type AlertsChip,
  type AlertsConfidence,
  type AlertsLandFilter,
  type AlertsList,
  type AlertsWidgetSpec,
} from "../lib/alertsWidgets";
import DashboardAlertsList, {
  type AlertsListView,
} from "./DashboardAlertsList";
import DashboardAlertsMapPane from "./DashboardAlertsMapPane";
import DashboardWidgetCard from "./DashboardWidgetCard";

/** A list stays fresh for a few hours: the data moves once a day. */
const ALERTS_STALE_MS = 3 * 60 * 60 * 1000;

/**
 * How long a custom range must stand before the map redraws for it. A date
 * input commits on every keystroke, and the dates on the way to
 * "01/08/2026" ("01/09/2026", with last month's digits still in place) are
 * complete dates of their own; each would be a tile reload.
 */
const CUSTOM_SETTLE_MS = 400;

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
 * chips filter the cached rows. The widget looks two weeks back from the
 * latest alert day (the headline's "since" period, the furthest a custom
 * range reaches), so when the data lags today by more than the window
 * covers it asks once more for a window reaching that far; an Intersects
 * land filter asks again too, and then the rows on show stay while the new
 * list loads. Chips, confidence, land filter and the params toggle are view
 * state, never persisted.
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
  const [landFilter, setLandFilter] = useState<AlertsLandFilter>("any");
  const [custom, setCustom] = useState<DateRange>();
  // The custom range once the typing has paused: the list filters off
  // `custom` at once, the map follows this one.
  const [settledCustom, setSettledCustom] = useState<DateRange>();
  // The window asked of the backend. It starts as the widget's `days` ending
  // today and only ever widens, to reach two weeks before the latest alert day.
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

  const range = list ? chipRange(chip, list, custom) : undefined;
  const settledRange = useMemo(
    () => (list ? chipRange(chip, list, settledCustom) : undefined),
    [list, chip, settledCustom]
  );
  const rows =
    list && range ? visibleRows(rowsInRange(list.rows, range), confidence) : [];
  const view: AlertsListView =
    list && range
      ? { kind: "ready", range, anchor: list.anchor, failure }
      : failure
        ? { kind: "error", failure }
        : { kind: "loading" };

  const selectChip = (next: AlertsChip) => {
    if (!list) return;
    // The custom dates open on the last week, the widest preset, so there
    // is something to adjust from.
    if (next === "custom" && !custom) {
      const opening = chipRange("last-week", list);
      setCustom(opening);
      setSettledCustom(opening);
    }
    setChip(next);
  };

  // The list pane has already judged the range (inside the two weeks, in
  // order), so it is taken as it comes.
  const changeCustom = (next: DateRange) => {
    setCustom(next);
    setChip("custom");
  };

  // Once the typing has paused, the map follows the custom range.
  useEffect(() => {
    if (custom === settledCustom) return;
    const timer = setTimeout(() => setSettledCustom(custom), CUSTOM_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [custom, settledCustom]);

  // A list whose window stops short of two weeks before its latest alert
  // day (the data lags today by more than the window covers) is asked for
  // again, wider; the rows already held stay on show meanwhile. Reconciled
  // during render, like `held`: once the request reaches that far the
  // widened window is the same object, and nothing is set.
  if (list) {
    const since = sinceRange(list.anchor);
    if (needsWiderWindow(since, list.window)) {
      const wider = widenedWindow(since, requestWindow);
      if (wider !== requestWindow) setRequestWindow(wider);
    }
  }

  // The params row, as an analysis card's: the area and dataset chips every
  // chart carries, and the tier on show.
  const paramChips = useMemo<ParamChipData[]>(
    () => [
      ...buildChips({ areas: [aoi.name], dataset: "Integrated alerts" }),
      {
        label: "CONFIDENCE",
        value: confidenceLabel(confidence),
        colorScheme: "purple",
      },
    ],
    [aoi.name, confidence]
  );

  // The rows as the table shows them: the chip's period and the tier applied
  // here, the land filter by the fetch.
  const saveCsv = () => {
    if (!range) return;
    downloadCsv(
      alertsCsv(rows, confidence),
      alertsCsvFilename(aoi.name, range)
    );
  };

  return (
    <DashboardWidgetCard
      title={spec.title}
      paramChips={paramChips}
      removeMode="widget"
      isOwner={isOwner}
      isDouble={isDouble}
      onArmDrag={onArmDrag}
      onToggleSize={onToggleSize}
      onRename={onRename}
      onRemove={onRemove}
      body={
        <Box px="8px" pb="8px">
          <DashboardAlertsList
            view={view}
            isFetching={query.isFetching && !!list}
            rows={rows}
            headline={list ? alertsHeadline(list, confidence) : undefined}
            chip={chip}
            confidence={confidence}
            landFilter={landFilter}
            custom={custom}
            sideBySide={isDouble}
            mapPane={
              <DashboardAlertsMapPane
                title={spec.title}
                layer={alertsMapLayer(spec, landFilter, settledRange)}
                aoi={areaAoi}
              />
            }
            onChip={selectChip}
            onConfidence={setConfidence}
            onLandFilter={setLandFilter}
            onCustomChange={changeCustom}
            onDownloadCsv={saveCsv}
            onRetry={() => query.refetch()}
          />
        </Box>
      }
    />
  );
}
