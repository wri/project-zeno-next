import type { InsightWidget } from "@/app/types/chat";
import type { DashboardWidget } from "@/app/schemas/api/dashboards/get";
import { CONTEXT_LAYER_METADATA } from "@/app/constants/datasets";
import { patchPrimaryForestTileUrl } from "@/app/utils/datasetLayerContext";

// Chart types ChartWidget can render (InsightWidget["type"] minus
// "dataset-card", which never comes from the dashboards API).
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

/**
 * Maps a dashboard insight widget (snake_case REST shape) to the
 * `InsightWidget` consumed by `WidgetMessage` — the streaming counterpart of
 * `generateInsightsTool`. Returns `null` when there is nothing to render
 * (insight hidden from this viewer, or no charts); the caller shows a
 * "not available" placeholder per the API contract.
 *
 * Only the first chart is rendered (MVP). Unknown chart types fall back to
 * "table" so the data stays visible.
 */
export function dashboardWidgetToInsightWidget(
  widget: DashboardWidget
): InsightWidget | null {
  const insight = widget.insight;
  const chart = insight?.charts?.length
    ? [...insight.charts].sort((a, b) => a.position - b.position)[0]
    : undefined;
  if (!insight || !chart) return null;

  const seriesFields = chart.series_fields ?? undefined;
  return {
    id: chart.id,
    type: CHART_TYPES.has(chart.chart_type)
      ? (chart.chart_type as InsightWidget["type"])
      : "table",
    title: widget.config?.title ?? chart.title,
    description: insight.insight_text ?? "",
    data: chart.chart_data,
    xAxis: chart.x_axis,
    yAxis: chart.y_axis,
    ...(seriesFields?.length ? { seriesFields } : {}),
    insightId: insight.id,
  };
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

export interface MapWidgetSpec {
  title: string;
  caption?: string;
  /** Raster tile URL templates, bottom-to-top render order. */
  tileUrls: string[];
  kind: "dataset" | "imagery";
  /**
   * Imagery mosaics only cover their own area/zoom range, and the tile
   * service 500s (without CORS headers) on out-of-range tiles. The tilejson
   * provides minzoom/maxzoom/bounds to keep requests in range.
   */
  tilejsonUrl?: string;
}

/**
 * Maps a dashboard map widget's config (docs/dashboards-map-widgets-handoff.md)
 * to what `DashboardMapWidget` renders. The config is a self-contained
 * snapshot — tile URLs are fully resolved, so no catalog lookup is needed.
 * Returns `null` when there is no renderable tile URL.
 */
export function dashboardWidgetToMapSpec(
  widget: DashboardWidget
): MapWidgetSpec | null {
  const config = widget.config;
  const dataset = config?.dataset;
  const imagery = config?.imagery;

  if (dataset?.tile_url) {
    const ctx = dataset.context_layer
      ? dataset.context_layers?.find((c) => c.name === dataset.context_layer)
      : undefined;
    const tileUrls: string[] = [];
    // Vector context layers need MVT styling the widget map doesn't do (MVP);
    // only raster context layers render, beneath the main dataset layer.
    const ctxIsVector =
      !!ctx &&
      (!!ctx.source_layer ||
        ctx.type === "vector" ||
        !!CONTEXT_LAYER_METADATA[ctx.name]?.vectorStyle);
    if (ctx?.tile_url && !ctxIsVector) {
      tileUrls.push(patchPrimaryForestTileUrl(ctx.tile_url));
    }
    tileUrls.push(dataset.tile_url);

    const dates = [dataset.start_date, dataset.end_date].filter(Boolean);
    return {
      title: config?.title ?? dataset.dataset_name ?? "Map",
      caption: dates.length ? dates.join(" – ") : undefined,
      tileUrls,
      kind: "dataset",
    };
  }

  if (imagery?.tile_url) {
    const parts = [imagery.aoi_names?.join(", "), imagery.target_date].filter(
      Boolean
    );
    return {
      title: config?.title ?? "Satellite imagery",
      caption: parts.length ? parts.join(" · ") : undefined,
      tileUrls: [imagery.tile_url],
      kind: "imagery",
      ...(imagery.tilejson_url ? { tilejsonUrl: imagery.tilejson_url } : {}),
    };
  }

  return null;
}
