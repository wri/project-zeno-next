import { format, parseISO } from "date-fns";

import { mapWidgetLayer, str, type MapWidgetLayer } from "./mapWidgets";

/**
 * The `widget_type: "alerts"` widget (PZB-1468): a live list of integrated
 * alert days beside the alerts map, both driven by one date range. This module
 * is the pure half — the config parser, the normalised list shape the API
 * adapter produces, and the string-dated window arithmetic the widget runs on.
 *
 * Every date here is an ISO `YYYY-MM-DD` string and stays one. `new Date(iso)`
 * parses as UTC midnight, so reading it back through local getters west of UTC
 * loses a day; comparisons are therefore lexicographic and day arithmetic goes
 * through `Date.UTC`, never through a `Date`'s local accessors. (`parseISO` of
 * a date-only string is local midnight, so the display formats are safe.)
 */

export interface DateRange {
  /** Inclusive ISO date. */
  start: string;
  /** Inclusive ISO date. */
  end: string;
}

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
  /** The window fetched per view; chips filter inside it. */
  days: number;
  /** The alerts tile layer of the map pane (`config.dataset`, as a map widget's). */
  layer: MapWidgetLayer;
}

/** One alert day, as the list pane renders it. */
export interface AlertDay {
  date: string;
  highHa: number;
  highestHa: number;
  totalHa: number;
  /** Inside the latest full alert week (the backend's rule, never recomputed here). */
  isNew: boolean;
}

/** `POST /api/alerts/list`, normalised by `api/alerts.ts::toAlertsList`. */
export interface AlertsList {
  /** The last day the data covers; every chip counts back from it. */
  dataTo: string;
  /** The window the rows cover — the request's dates after the backend clamped them. */
  window: DateRange;
  /** The latest full alert week (Sunday to Saturday); the "New this week" range. */
  newWeek: DateRange;
  /** Newest first. */
  rows: AlertDay[];
}

export type AlertsChip =
  | "new-week"
  | "last-day"
  | "last-3-days"
  | "last-week"
  | "custom";

export type AlertsConfidence = "all" | "high" | "highest";

/**
 * What each confidence choice shows: the row field it sums, the column it
 * heads, and its name in the toggle. "All" is the two tiers and their total.
 */
export const TIERS: Record<
  AlertsConfidence,
  { field: "highHa" | "highestHa" | "totalHa"; label: string; name: string }
> = {
  all: { field: "totalHa", label: "Total (ha)", name: "All" },
  high: { field: "highHa", label: "High (ha)", name: "High" },
  highest: { field: "highestHa", label: "Highest (ha)", name: "Highest" },
};

/** The area columns a confidence choice shows: a single tier is its own total. */
export function tierColumns(
  confidence: AlertsConfidence
): (typeof TIERS)[AlertsConfidence][] {
  return confidence === "all"
    ? [TIERS.high, TIERS.highest, TIERS.all]
    : [TIERS[confidence]];
}

/** The badge row's CONFIDENCE value: the tiers in the shown rows. */
export function confidenceLabel(confidence: AlertsConfidence): string {
  return confidence === "all"
    ? `${TIERS.high.name} · ${TIERS.highest.name}`
    : TIERS[confidence].name;
}

export const DEFAULT_ALERTS_DAYS = 30;

/** The integrated alerts catalogue entry's `start_date`: no alert is older. */
export const ALERTS_DATASET_START = "2023-12-01";

/** The backend refuses a window of more than this many days. */
export const MAX_CUSTOM_DAYS = 365;

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

  const days =
    typeof a.days === "number" && Number.isInteger(a.days) && a.days > 0
      ? a.days
      : DEFAULT_ALERTS_DAYS;

  return {
    title: str(config.title) ?? `Integrated alerts in ${name}`,
    aoi: { source, srcId, subtype, name },
    days,
    layer,
  };
}

// ── Dates ──────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function utcMillis(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10);
}

/** `iso` moved by `days` (negative for earlier), timezone-free. */
export function shiftIsoDate(iso: string, days: number): string {
  return toIso(utcMillis(iso) + days * DAY_MS);
}

/** Today as an ISO date in UTC. `now` is injectable for tests. */
export function todayIso(now: number = Date.now()): string {
  return toIso(now);
}

/**
 * The window the widget asks for before any response exists: `days` days
 * ending today. The backend clamps the end to its data; from then on the
 * response's own `window` is the truth.
 */
export function initialWindow(days: number, today: string): DateRange {
  return { start: shiftIsoDate(today, -(days - 1)), end: today };
}

/**
 * The inclusive range a chip stands for, counted back from the data's last
 * day (`dataTo`), never from today: the newest alert day is what "last day"
 * means to someone reading the list. A custom range is clamped into the data
 * and ordered.
 */
export function chipRange(
  chip: AlertsChip,
  list: Pick<AlertsList, "dataTo" | "newWeek">,
  custom?: DateRange
): DateRange {
  const { dataTo } = list;
  switch (chip) {
    case "new-week":
      return { ...list.newWeek };
    case "last-day":
      return { start: dataTo, end: dataTo };
    case "last-3-days":
      return { start: shiftIsoDate(dataTo, -2), end: dataTo };
    case "last-week":
      return { start: shiftIsoDate(dataTo, -6), end: dataTo };
    case "custom": {
      const end = custom && custom.end < dataTo ? custom.end : dataTo;
      const wanted = custom?.start ?? end;
      const start = wanted > end ? end : wanted;
      return { start, end };
    }
  }
}

/**
 * The earliest start a custom range may have: the dataset's first day, or
 * the day that makes the range ending on `dataTo` exactly `MAX_CUSTOM_DAYS`
 * long, whichever is later. The inputs' `min` and the handler's check both
 * read this, so the widget can never ask for a window the backend refuses.
 */
export function customStartMin(dataTo: string): string {
  const yearBack = shiftIsoDate(dataTo, -(MAX_CUSTOM_DAYS - 1));
  return yearBack > ALERTS_DATASET_START ? yearBack : ALERTS_DATASET_START;
}

/** Whether `range` reaches outside the window the rows were fetched for. */
export function needsWiderWindow(range: DateRange, window: DateRange): boolean {
  return range.start < window.start || range.end > window.end;
}

/** The smallest window covering both — the next request when a custom range reaches outside. */
export function widenedWindow(range: DateRange, window: DateRange): DateRange {
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
 * The rows a confidence choice shows. A single tier drops the days that had
 * nothing in it — "High" must not list a day of zero high-confidence alerts —
 * while "All" keeps every day.
 */
export function visibleRows(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): AlertDay[] {
  if (confidence === "all") return [...rows];
  const { field } = TIERS[confidence];
  return rows.filter((row) => row[field] > 0);
}

/** The footer's numbers: alert days and hectares in the shown tier. */
export function rowsSummary(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): { days: number; ha: number } {
  const { field } = TIERS[confidence];
  return {
    days: rows.length,
    ha: rows.reduce((sum, row) => sum + row[field], 0),
  };
}

/** The "New this week" chip's hectares: the new rows, in the shown tier. */
export function newWeekHa(
  rows: readonly AlertDay[],
  confidence: AlertsConfidence
): number {
  return rowsSummary(
    rows.filter((row) => row.isNew),
    confidence
  ).ha;
}

// ── Tiles ──────────────────────────────────────────────────────────────────

/**
 * Sets one query parameter on a tile URL template, in place when present and
 * appended otherwise. A string edit on purpose: `new URL()` would percent-
 * encode the `{z}/{x}/{y}` placeholders in the path.
 */
function withQueryParam(url: string, key: string, value: string): string {
  const present = new RegExp(`([?&])${key}=[^&#]*`);
  if (present.test(url)) return url.replace(present, `$1${key}=${value}`);
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

/**
 * The alerts layer for a period: the snapshot's tile URL with its
 * `start_date`/`end_date` rewritten (the integrated alerts tile service reads
 * them as query parameters, and the snapshot already carries the build-time
 * pair), and the legend's dates to match. A snapshot whose URL lacks the
 * parameters gets them appended rather than drawing every alert since the
 * dataset began. The context sub-layer carries no dates and is left alone.
 */
export function withTileDates(
  layer: MapWidgetLayer,
  range: DateRange
): MapWidgetLayer {
  return {
    ...layer,
    tileUrl: withQueryParam(
      withQueryParam(layer.tileUrl, "start_date", range.start),
      "end_date",
      range.end
    ),
    startDate: range.start,
    endDate: range.end,
  };
}

// ── Formatting ─────────────────────────────────────────────────────────────

/** "26 Sep 2026" — the table and explainer form. */
export function formatAlertDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

/** "SEP 28, 2026" — the badge row's `DATA TO` form. */
export function formatDataTo(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy").toUpperCase();
}

const HA_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Hectares to one decimal; a positive sliver reads "<0.1" rather than "0". */
export function formatHa(ha: number): string {
  if (ha > 0 && ha < 0.1) return "<0.1";
  return HA_FORMAT.format(ha);
}
