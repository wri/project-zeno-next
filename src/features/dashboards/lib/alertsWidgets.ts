import { format, parseISO } from "date-fns";

import { rowsToCsv } from "@/src/shared/lib/csv";
import { shiftIsoDate, type DateRange } from "@/src/shared/lib/iso-date";
import {
  mapWidgetLayer,
  str,
  withTileDates,
  type MapWidgetLayer,
} from "./mapWidgets";

/**
 * The `widget_type: "alerts"` widget (PZB-1468): a live list of integrated
 * alert days beside the alerts map, both driven by one date range. This module
 * is the pure half — the config parser, the normalised list shape the API
 * adapter produces, and the string-dated window arithmetic the widget runs on.
 *
 * Every date here is an ISO `YYYY-MM-DD` string and stays one: comparisons
 * are lexicographic and day arithmetic goes through `shiftIsoDate`, never
 * through a `Date`'s local accessors. (`parseISO` of a date-only string is
 * local midnight, so the display formats are safe.)
 */

/** The area the widget lists alerts for — the request's identity. */
export interface AlertsAoi {
  source: string;
  srcId: string;
  subtype: string;
  name: string;
}

/** A `widget_type: "alerts"` config, parsed and settled. */
export interface AlertsWidgetSpec {
  /** Card header: `config.title` override, else the default label. */
  title: string;
  aoi: AlertsAoi;
  /** The alerts tile layer of the map pane (`config.dataset`, as a map widget's). */
  layer: MapWidgetLayer;
  /**
   * The same layer with a land class drawn beneath it, per Intersects
   * choice, from the snapshot's `context_layers` entries of the same names;
   * a choice is absent when the snapshot carries no such entry (widgets
   * built before the backend added them).
   */
  overlays: Partial<Record<AlertsLandFilter, MapWidgetLayer>>;
}

/** One alert day, as the list pane renders it. */
export interface AlertDay {
  date: string;
  highHa: number;
  highestHa: number;
  totalHa: number;
  /** Inside the new week (the backend's rule, never recomputed here). */
  isNew: boolean;
}

/** `POST /api/alerts/list`, normalised by `api/alerts.ts::toAlertsList`. */
export interface AlertsList {
  /**
   * The newest alert detection in the whole dataset, as the dashboards list
   * reports it ("Latest alert detected"); absent when the backend could not
   * read it.
   */
  latestAlertDate?: string;
  /**
   * The day every chip counts back from and the last day a custom range may
   * reach: `latestAlertDate`, else the area's latest alert day in the
   * window, else the window's end.
   */
  anchor: string;
  /** The window the rows cover — the request's dates after the backend clamped them. */
  window: DateRange;
  /**
   * The 7 days ending on the latest alert date, the week the dashboards list
   * counts (a calendar week when the backend could not read that date); the
   * "New alerts" range.
   */
  newWeek: DateRange;
  /** Newest first. */
  rows: AlertDay[];
}

export type AlertsChip = "new-week" | "last-30-days" | "custom";

export type AlertsConfidence = "all" | "high" | "highest";

/**
 * What each confidence choice shows: the row field it sums, the column it
 * heads, and its name in the toggle. "All" is the two tiers and their total.
 */
export const TIERS: Record<
  AlertsConfidence,
  { field: "highHa" | "highestHa" | "totalHa"; name: string }
> = {
  all: { field: "totalHa", name: "All" },
  high: { field: "highHa", name: "High" },
  highest: { field: "highestHa", name: "Highest" },
};

/** The two tiers "All" is made of. */
const SPLIT_TIERS = [TIERS.high, TIERS.highest];

/**
 * The table's CONFIDENCE cell: the tiers a day had alerts in, under "All",
 * or the one tier on show.
 */
export function rowTiers(row: AlertDay, confidence: AlertsConfidence): string {
  if (confidence !== "all") return TIERS[confidence].name;
  return SPLIT_TIERS.filter((tier) => row[tier.field] > 0)
    .map((tier) => tier.name)
    .join(" · ");
}

/** The table's TOTAL AREA cell: the day's area in the shown tier. */
export function rowArea(row: AlertDay, confidence: AlertsConfidence): number {
  return row[TIERS[confidence].field];
}

/** The land classes the analytics API can restrict the alerts to, and the snapshot can draw beneath them. */
export const LAND_OVERLAYS = ["natural_lands", "natural_forests"] as const;
export type AlertsLandOverlay = (typeof LAND_OVERLAYS)[number];

/** The Intersects choice: no restriction, or one of the land classes. */
export type AlertsLandFilter = "any" | AlertsLandOverlay;

/** Each Intersects choice's label and how the explainer says it (nothing for "any"). */
export const LAND_FILTERS: Record<
  AlertsLandFilter,
  { label: string; phrase?: string }
> = {
  any: { label: "Any" },
  natural_lands: { label: "Natural lands", phrase: "on natural lands" },
  natural_forests: { label: "Natural forests", phrase: "on natural forests" },
};

/** The badge row's CONFIDENCE value: the tiers in the shown rows. */
export function confidenceLabel(confidence: AlertsConfidence): string {
  return confidence === "all"
    ? SPLIT_TIERS.map((tier) => tier.name).join(" · ")
    : TIERS[confidence].name;
}

/**
 * How far back the widget looks from the latest alert date: the Last 30
 * days pill, the headline's "alerts since" period and the furthest a custom
 * range may start.
 */
const SINCE_DAYS = 30;

/**
 * Parses an alerts widget's config into a renderable spec, or null when it
 * cannot be rendered (no `alerts.aoi` identity, or no alerts layer to put on
 * the map — the caller shows a placeholder). The backend validates the config
 * on create, so null means a malformed or future config shape.
 *
 * `fallbackAreaName` is the dashboard's area name, for a config whose `aoi`
 * carries no name.
 */
export function alertsWidgetSpec(
  config: Record<string, unknown>,
  fallbackAreaName?: string
): AlertsWidgetSpec | null {
  const alerts = config.alerts;
  if (!alerts || typeof alerts !== "object") return null;
  const a = alerts as Record<string, unknown>;
  const rawAoi = a.aoi;
  if (!rawAoi || typeof rawAoi !== "object") return null;
  const r = rawAoi as Record<string, unknown>;
  const source = str(r.source);
  const srcId = str(r.src_id);
  const subtype = str(r.subtype);
  if (!source || !srcId || !subtype) return null;
  const name = str(r.name) ?? str(fallbackAreaName) ?? srcId;

  const dataset = config.dataset;
  if (!dataset || typeof dataset !== "object") return null;
  const layer = mapWidgetLayer({ dataset });
  if (!layer) return null;
  // The snapshot's `context_layer` is null; an entry in its `context_layers`
  // becomes the active one only for the matching Intersects choice.
  const overlays: AlertsWidgetSpec["overlays"] = {};
  for (const name of LAND_OVERLAYS) {
    const overlay = mapWidgetLayer({
      dataset: { ...dataset, context_layer: name },
    });
    if (overlay?.contextTileUrl) overlays[name] = overlay;
  }

  return {
    title: str(config.title) ?? `Integrated alerts in ${name}`,
    aoi: { source, srcId, subtype, name },
    layer,
    overlays,
  };
}

/**
 * The map pane's layer: the alerts, with the chosen land class drawn beneath
 * them when the snapshot carries it, dated to the period on show (the
 * snapshot's own period until there is one).
 */
export function alertsMapLayer(
  spec: AlertsWidgetSpec,
  landFilter: AlertsLandFilter,
  range?: DateRange
): MapWidgetLayer {
  const layer = spec.overlays[landFilter] ?? spec.layer;
  return range ? withTileDates(layer, range) : layer;
}

// ── Dates ──────────────────────────────────────────────────────────────────

/**
 * The inclusive range a chip stands for, counted back from the list's
 * `anchor` (the latest alert date), never from today: alerts arrive days
 * after they are detected, so the days before today are not yet quiet. A
 * custom range is clamped to the anchor and ordered.
 */
export function chipRange(
  chip: AlertsChip,
  list: Pick<AlertsList, "anchor" | "newWeek">,
  custom?: DateRange
): DateRange {
  const { anchor } = list;
  switch (chip) {
    case "new-week":
      return { ...list.newWeek };
    case "last-30-days":
      return sinceRange(anchor);
    case "custom": {
      const end = custom && custom.end < anchor ? custom.end : anchor;
      const wanted = custom?.start ?? end;
      const start = wanted > end ? end : wanted;
      return { start, end };
    }
  }
}

/**
 * The 30 days to the latest alert date, inclusive: the Last 30 days pill,
 * the period the headline counts "alerts since", and the bounds of a custom
 * range (its inputs' `min` and `max`, and the check behind them).
 */
export function sinceRange(anchor: string): DateRange {
  return { start: shiftIsoDate(anchor, -(SINCE_DAYS - 1)), end: anchor };
}

/**
 * Why a custom range cannot be taken, or nothing when it can: a bound
 * `outside` the 30 days the widget covers (what a date input reports while
 * a year is still being typed, so it is ignored without comment), or an
 * `inverted` range, its end before its start (which the inputs say so about).
 */
export function customRangeProblem(
  range: DateRange,
  anchor: string
): "outside" | "inverted" | undefined {
  const since = sinceRange(anchor);
  const inside = (iso: string) => iso >= since.start && iso <= since.end;
  if (!inside(range.start) || !inside(range.end)) return "outside";
  return range.end < range.start ? "inverted" : undefined;
}

/** Whether `range` reaches outside the window the rows were fetched for. */
export function needsWiderWindow(range: DateRange, window: DateRange): boolean {
  return range.start < window.start || range.end > window.end;
}

/**
 * The smallest window covering both — the next request when a custom range
 * reaches outside. The same `window` object when it already covers the
 * range, so a state setter sees no change.
 */
export function widenedWindow(range: DateRange, window: DateRange): DateRange {
  if (!needsWiderWindow(range, window)) return window;
  return {
    start: range.start < window.start ? range.start : window.start,
    end: range.end > window.end ? range.end : window.end,
  };
}

// ── Rows ───────────────────────────────────────────────────────────────────

export function rowsInRange(
  rows: readonly AlertDay[],
  range: DateRange
): AlertDay[] {
  return rows.filter((row) => row.date >= range.start && row.date <= range.end);
}

/**
 * The rows a confidence choice shows: the days with alerts in the shown tier.
 * "High" must not list a day of zero high-confidence alerts; "All" keeps
 * every day, as the backend sends only days with high or highest alerts.
 */
export function visibleRows(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): AlertDay[] {
  return rows.filter((row) => rowArea(row, confidence) > 0);
}

/** The footer's numbers: alert days and hectares in the shown tier. */
export function rowsSummary(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): { days: number; ha: number } {
  return {
    days: rows.length,
    ha: rows.reduce((sum, row) => sum + rowArea(row, confidence), 0),
  };
}

/** The headline's "new alerts" hectares: the new rows, in the shown tier. */
export function newWeekHa(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): number {
  return rowsSummary(
    rows.filter((row) => row.isNew),
    confidence
  ).ha;
}

/**
 * The headline over the list (the design's "Summary headline"): the new
 * week's hectares with the week it covers, and the hectares of the 30 days
 * to the latest alert date. Both in the shown tier.
 */
export interface AlertsHeadline {
  newWeek: { ha: number; range: DateRange };
  since: { ha: number; range: DateRange };
}

export function alertsHeadline(
  list: AlertsList,
  confidence: AlertsConfidence
): AlertsHeadline {
  const since = sinceRange(list.anchor);
  return {
    newWeek: { ha: newWeekHa(list.rows, confidence), range: list.newWeek },
    since: {
      ha: rowsSummary(rowsInRange(list.rows, since), confidence).ha,
      range: since,
    },
  };
}

// ── Formatting ─────────────────────────────────────────────────────────────

/** "26 Sep 2026" — the table and explainer form. */
export function formatAlertDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

/** "7 Oct" — the headline's "alerts since" day. */
export function formatSinceDay(iso: string): string {
  return format(parseISO(iso), "d MMM");
}

/**
 * "11 – 17 OCT 2026", "28 SEP – 4 OCT 2026", "28 DEC 2025 – 3 JAN 2026" —
 * the headline's mono sublabel, naming each part of the date only where the
 * two ends differ in it; a single day is "16 OCT 2026".
 */
export function formatRangeCaps(range: DateRange): string {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  const endText = format(end, "d MMM yyyy");
  if (range.start === range.end) return endText.toUpperCase();
  const startText =
    format(start, "yyyy") !== format(end, "yyyy")
      ? format(start, "d MMM yyyy")
      : format(start, "MMM") !== format(end, "MMM")
        ? format(start, "d MMM")
        : format(start, "d");
  return `${startText} – ${endText}`.toUpperCase();
}

// ── Download ───────────────────────────────────────────────────────────────

/**
 * The rows on show as CSV: the day, the tiers it had alerts in (or the one
 * tier on show, as the table's CONFIDENCE cell), every tier's area and the
 * new-week flag.
 */
export function alertsCsv(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): string {
  return rowsToCsv(
    rows.map((row) => ({
      alert_date: row.date,
      confidence: rowTiers(row, confidence),
      high_ha: row.highHa,
      highest_ha: row.highestHa,
      total_ha: row.totalHa,
      new: row.isNew,
    })),
    ["alert_date", "confidence", "high_ha", "highest_ha", "total_ha", "new"]
  );
}

/** `integrated-alerts-<area>-<start>-<end>.csv`, the area name slugged to ASCII. */
export function alertsCsvFilename(areaName: string, range: DateRange): string {
  const area = areaName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `integrated-alerts-${area || "area"}-${range.start}-${range.end}.csv`;
}

const HA_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Hectares to one decimal; a positive sliver reads "<0.1" rather than "0". */
export function formatHa(ha: number): string {
  if (ha > 0 && ha < 0.1) return "<0.1";
  return HA_FORMAT.format(ha);
}
