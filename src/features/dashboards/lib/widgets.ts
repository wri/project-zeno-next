import { firstChartTitle } from "@/src/entities/insight";
import type { CodeActPart, InsightWidget } from "@/app/types/chat";
import type { DashboardWidget } from "../api/schemas";

// Chart types the chart widget can render (InsightWidget["type"] minus
// "dataset-card", which never comes from the dashboards API). Unknown types
// fall back to "table" so the data stays visible.
const CHART_TYPES = new Set([
  "line",
  "bar",
  "table",
  "pie",
  "stacked-bar",
  "grouped-bar",
  "area",
  "scatter",
]);

export type WidgetSize = "single" | "double";

/** The widget's persisted column span; anything but "double" is single. */
export function widgetSize(config: Record<string, unknown>): WidgetSize {
  return config.size === "double" ? "double" : "single";
}

/**
 * Map widgets default to full width: a map spans both columns.
 */
export function mapWidgetSize(config: Record<string, unknown>): WidgetSize {
  return config.size === "single" ? "single" : "double";
}

/**
 * The full config to PATCH for a size change. The backend replaces config
 * whole (no merge), so presentation keys like default_view/title must ride
 * along.
 */
export function withSize(
  config: Record<string, unknown>,
  size: WidgetSize
): Record<string, unknown> {
  return { ...config, size };
}

/**
 * Per-chart column span. A widget's charts render as individual grid cards,
 * so each chart carries its own span under `config.sizes[chartId]`; the
 * widget-level `size` is the pre-split fallback for older configs.
 */
export function chartSize(
  config: Record<string, unknown>,
  chartId: string
): WidgetSize {
  const sizes = config.sizes;
  if (sizes && typeof sizes === "object") {
    const own = (sizes as Record<string, unknown>)[chartId];
    if (own === "double" || own === "single") return own;
  }
  return widgetSize(config);
}

/** The full config to PATCH for a per-chart size change (config is replaced whole). */
export function withChartSize(
  config: Record<string, unknown>,
  chartId: string,
  size: WidgetSize
): Record<string, unknown> {
  const sizes =
    config.sizes && typeof config.sizes === "object"
      ? (config.sizes as Record<string, unknown>)
      : {};
  return { ...config, sizes: { ...sizes, [chartId]: size } };
}

/**
 * A chart's manual title override. Charts render as individual cards, so each
 * carries its own rename under `config.titles[chartId]` (mirrors
 * `config.sizes`). Returns undefined when unset/blank so the caller falls back
 * to the chart's own title.
 */
export function chartTitleOverride(
  config: Record<string, unknown>,
  chartId: string
): string | undefined {
  const titles = config.titles;
  if (titles && typeof titles === "object") {
    const own = (titles as Record<string, unknown>)[chartId];
    if (typeof own === "string" && own.trim()) return own;
  }
  return undefined;
}

/**
 * The full config to PATCH for a per-chart rename (config is replaced whole).
 * A blank name clears the override so the card reverts to its default title;
 * the `titles` key is dropped once empty to keep configs tidy.
 */
export function withChartTitle(
  config: Record<string, unknown>,
  chartId: string,
  name: string
): Record<string, unknown> {
  const titles =
    config.titles && typeof config.titles === "object"
      ? { ...(config.titles as Record<string, unknown>) }
      : {};
  const trimmed = name.trim();
  if (trimmed) titles[chartId] = trimmed;
  else delete titles[chartId];

  const out = { ...config };
  if (Object.keys(titles).length > 0) out.titles = titles;
  else delete out.titles;
  return out;
}

/**
 * The full config to PATCH for a single-card widget rename (map / imagery),
 * whose title lives under `config.title` — the override `mapWidgetLayer`
 * already reads. A blank name clears it (reverts to the default label).
 */
export function withWidgetTitle(
  config: Record<string, unknown>,
  name: string
): Record<string, unknown> {
  const trimmed = name.trim();
  const out = { ...config };
  if (trimmed) out.title = trimmed;
  else delete out.title;
  return out;
}

/**
 * The full config to PATCH for a text-widget edit (config is replaced whole).
 * Stores the markdown body under `config.text` — the key `widgetText` reads.
 * A blank body drops the key so the card falls back to the empty-note
 * placeholder rather than persisting an empty string.
 */
export function withText(
  config: Record<string, unknown>,
  text: string
): Record<string, unknown> {
  const out = { ...config };
  if (text.trim()) out.text = text;
  else delete out.text;
  return out;
}

/**
 * The chart ids a widget shows. `config.chartIds` when present — the explicit
 * subset a user assembled chart-by-chart from the Analyses pane, ordered by the
 * insight's own chart order. Absent means "all charts", i.e. a widget added
 * whole (chat toggle or agent), so older configs keep rendering every chart.
 */
export function shownChartIds(
  config: Record<string, unknown>,
  allChartIds: string[]
): string[] {
  const ids = config.chartIds;
  if (!Array.isArray(ids)) return allChartIds;
  const wanted = new Set(
    ids.filter((id): id is string => typeof id === "string")
  );
  return allChartIds.filter((id) => wanted.has(id));
}

/** Whether a specific chart of the insight is currently shown by the widget. */
export function isChartShown(
  config: Record<string, unknown>,
  chartId: string,
  allChartIds: string[]
): boolean {
  return shownChartIds(config, allChartIds).includes(chartId);
}

/**
 * The full config to PATCH to add a chart to the shown set (config is replaced
 * whole). Idempotent. Once every chart is shown the `chartIds` key is dropped so
 * the widget reverts to the tidy "all charts" form.
 */
export function withChartShown(
  config: Record<string, unknown>,
  chartId: string,
  allChartIds: string[]
): Record<string, unknown> {
  const shown = new Set(shownChartIds(config, allChartIds));
  shown.add(chartId);
  const next = allChartIds.filter((id) => shown.has(id));
  const out = { ...config };
  if (next.length >= allChartIds.length) delete out.chartIds;
  else out.chartIds = next;
  return out;
}

/**
 * The full config to PATCH to hide a chart (config is replaced whole). Hiding
 * the last shown chart keeps an explicit empty subset (`chartIds: []`) — the
 * widget survives so its summary can still render and the Customize menu can
 * re-show charts; absent `chartIds` still means "all charts".
 */
export function withChartHidden(
  config: Record<string, unknown>,
  chartId: string,
  allChartIds: string[]
): Record<string, unknown> {
  const next = shownChartIds(config, allChartIds).filter(
    (id) => id !== chartId
  );
  return { ...config, chartIds: next };
}

/**
 * Whether the widget shows its insight narrative. Hidden only by an explicit
 * `summaryHidden: true`, so older configs keep showing the summary.
 */
export function isSummaryShown(config: Record<string, unknown>): boolean {
  return config.summaryHidden !== true;
}

/**
 * The full config to PATCH for a summary visibility change (config is
 * replaced whole). The key is dropped when shown to keep configs tidy.
 */
export function withSummaryShown(
  config: Record<string, unknown>,
  shown: boolean
): Record<string, unknown> {
  const out = { ...config };
  if (shown) delete out.summaryHidden;
  else out.summaryHidden = true;
  return out;
}

/**
 * Whether a widget's config holds anything the owner arranged by hand — the
 * per-chart spans and renames, the shown-chart subset, the summary toggle and
 * the title override written by the `with*` helpers above.
 *
 * Deleting a widget discards all of it with no undo (the config lives only on
 * the widget), so removal paths that would otherwise be a single click ask for
 * confirmation when this is true. A widget added whole and left alone has an
 * empty config, and stays a one-click remove.
 */
export function hasWidgetCustomization(
  config: Record<string, unknown>
): boolean {
  if (config.summaryHidden === true) return true;
  // An explicit `chartIds` is a customisation at any length: absent means "all
  // charts", so even the empty array is a deliberate "hide everything".
  if (Array.isArray(config.chartIds)) return true;
  return ["sizes", "titles", "title", "size"].some((key) => {
    const value = config[key];
    if (typeof value === "string") return value.trim().length > 0;
    if (value && typeof value === "object")
      return Object.keys(value).length > 0;
    return false;
  });
}

/**
 * The insight module's display title: the widget's `config.title` override,
 * else the shared `firstChartTitle` fallback over all charts (not just shown
 * ones, so the title doesn't jump when charts are hidden), else "Analysis".
 *
 * The Analyses panel resolves a curated insight's own `record.title` ahead of
 * that fallback; there is deliberately no equivalent here, because the
 * dashboards API's insight expansion carries no title field. Add one here only
 * once it does — mirroring the panel's rule against a title we don't have would
 * just reintroduce the divergence the shared fallback removes.
 */
export function moduleTitle(widget: DashboardWidget): string {
  const override =
    typeof widget.config.title === "string" ? widget.config.title.trim() : "";
  if (override) return override;
  return firstChartTitle(widget.insight?.charts ?? []) || "Analysis";
}

/**
 * Everything the dashboard's insight module renders, in one node-testable
 * shape: header title, narrative visibility, the shown chart cards
 * (`dashboardWidgetToInsightWidgets`) and the full chart roster for the
 * Customize menu (position order, with per-chart rename overrides applied).
 */
export interface InsightModuleView {
  title: string;
  /** The narrative to render; "" when absent or blank. */
  summaryText: string;
  summaryShown: boolean;
  /**
   * No generation provenance ⇒ curated — the same rule `WidgetMessage`
   * applies to each card, so the module caption never contradicts the cards
   * beneath it.
   */
  curated: boolean;
  cards: InsightWidget[];
  allCharts: { id: string; title: string; shown: boolean }[];
}

export function insightModule(
  widget: DashboardWidget,
  { areaName }: { areaName?: string } = {}
): InsightModuleView {
  const charts = [...(widget.insight?.charts ?? [])].sort(
    (a, b) => a.position - b.position
  );
  const shown = new Set(
    shownChartIds(
      widget.config,
      charts.map((c) => c.id)
    )
  );
  return {
    title: moduleTitle(widget),
    summaryText: widget.insight?.insight_text?.trim()
      ? widget.insight.insight_text
      : "",
    summaryShown: isSummaryShown(widget.config),
    curated: insightCodeactParts(widget.insight).length === 0,
    cards: dashboardWidgetToInsightWidgets(widget, { areaName }),
    allCharts: charts.map((chart) => ({
      id: chart.id,
      title: chartTitleOverride(widget.config, chart.id) ?? chart.title,
      shown: shown.has(chart.id),
    })),
  };
}

/** The insight's well-formed provenance parts; [] when absent or malformed. */
function insightCodeactParts(
  insight: DashboardWidget["insight"]
): CodeActPart[] {
  return Array.isArray(insight?.codeact_parts)
    ? insight.codeact_parts.filter(
        (p): p is CodeActPart =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as CodeActPart).type === "string" &&
          typeof (p as CodeActPart).content === "string"
      )
    : [];
}

/**
 * Maps a dashboard insight widget (snake_case REST shape) to the
 * `InsightWidget`s consumed by `WidgetMessage` — the persisted counterpart
 * of `generateInsightsTool`, which produces one card per chart. Only the
 * widget's shown charts (`config.chartIds`, or all when absent) are returned.
 * Returns `[]` when there is nothing to render (insight hidden from this
 * viewer, or no shown charts); the caller shows a "not available" placeholder
 * per the API contract.
 *
 * The widget's `config.title` override and the insight narrative apply to
 * the first chart (the card's visual header); provenance parts feed the
 * "view how this was generated" drawer. The API insight carries no analysis
 * parameters, but a dashboard is scoped to exactly one area — pass its name
 * as `areaName` so every card gets an AREA param chip.
 */
export function dashboardWidgetToInsightWidgets(
  widget: DashboardWidget,
  { areaName }: { areaName?: string } = {}
): InsightWidget[] {
  const insight = widget.insight;
  if (!insight?.charts?.length) return [];

  const codeactParts = insightCodeactParts(insight);
  const generation = codeactParts.length
    ? { codeact_parts: codeactParts }
    : undefined;
  const titleOverride =
    typeof widget.config.title === "string" ? widget.config.title : undefined;
  const analysisParams = areaName ? { areas: [areaName] } : undefined;

  const sorted = [...insight.charts].sort((a, b) => a.position - b.position);
  const shown = new Set(
    shownChartIds(
      widget.config,
      sorted.map((c) => c.id)
    )
  );

  return sorted
    .filter((chart) => shown.has(chart.id))
    .map((chart, index) => {
      const seriesFields = chart.series_fields ?? undefined;
      return {
        id: chart.id,
        type: CHART_TYPES.has(chart.chart_type)
          ? (chart.chart_type as InsightWidget["type"])
          : "table",
        // Per-chart rename wins; else the legacy first-chart `config.title`
        // override; else the chart's own title.
        title:
          chartTitleOverride(widget.config, chart.id) ??
          ((index === 0 && titleOverride) || chart.title),
        description: index === 0 ? (insight.insight_text ?? "") : "",
        data: chart.chart_data,
        xAxis: chart.x_axis,
        yAxis: chart.y_axis,
        ...(seriesFields?.length ? { seriesFields } : {}),
        ...(generation ? { generation } : {}),
        ...(analysisParams ? { analysisParams } : {}),
      };
    });
}

/**
 * A text widget's markdown body (`config.text` per the widgets API), or null
 * when absent/blank — the caller shows a placeholder. The API validates the
 * key on create, so null means a malformed or hand-written config.
 */
export function widgetText(config: Record<string, unknown>): string | null {
  return typeof config.text === "string" && config.text.trim()
    ? config.text
    : null;
}

export interface WidgetPositionPatch {
  id: string;
  position: number;
}

/**
 * Moves a widget within the given render order and computes the widget
 * `position` PATCHes needed to persist it. The backend PATCH sets only the
 * targeted widget's position (no sibling renumbering), so every widget whose
 * stored position differs from its new index gets a patch — this also
 * normalises non-contiguous server positions (e.g. after deletions).
 */
export function computeReorder(
  widgets: DashboardWidget[],
  fromIndex: number,
  toIndex: number
): { order: DashboardWidget[]; patches: WidgetPositionPatch[] } {
  const order = [...widgets];
  if (
    fromIndex !== toIndex &&
    fromIndex >= 0 &&
    fromIndex < order.length &&
    toIndex >= 0 &&
    toIndex < order.length
  ) {
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
  }
  const patches = order.flatMap((widget, index) =>
    widget.position === index ? [] : [{ id: widget.id, position: index }]
  );
  return { order, patches };
}
