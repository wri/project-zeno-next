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
 * Maps a dashboard insight widget (snake_case REST shape) to the
 * `InsightWidget`s consumed by `WidgetMessage` — the persisted counterpart
 * of `generateInsightsTool`, which produces one card per chart. Returns `[]`
 * when there is nothing to render (insight hidden from this viewer, or no
 * charts); the caller shows a "not available" placeholder per the API
 * contract.
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

  const codeactParts = Array.isArray(insight.codeact_parts)
    ? insight.codeact_parts.filter(
        (p): p is CodeActPart =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as CodeActPart).type === "string" &&
          typeof (p as CodeActPart).content === "string"
      )
    : [];
  const generation = codeactParts.length
    ? { codeact_parts: codeactParts }
    : undefined;
  const titleOverride =
    typeof widget.config.title === "string" ? widget.config.title : undefined;
  const analysisParams = areaName ? { areas: [areaName] } : undefined;

  return [...insight.charts]
    .sort((a, b) => a.position - b.position)
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
