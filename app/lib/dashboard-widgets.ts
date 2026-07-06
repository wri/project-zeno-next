import type { CodeActPart, DatasetInfo, InsightWidget } from "@/app/types/chat";
import type {
  Dashboard,
  DashboardWidget,
  DashboardWidgetConfig,
} from "@/app/schemas/api/dashboards/get";
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
 * `InsightWidget`s consumed by `WidgetMessage` — the streaming counterpart of
 * `generateInsightsTool`, which produces one card per chart. Returns `[]`
 * when there is nothing to render (insight hidden from this viewer, or no
 * charts); the caller shows a "not available" placeholder per the API
 * contract.
 *
 * The widget's `config.title` override applies to the first chart (the
 * card's visual header). Unknown chart types fall back to "table" so the
 * data stays visible; provenance parts feed the "view how this was
 * generated" drawer.
 */
export function dashboardWidgetToInsightWidgets(
  widget: DashboardWidget
): InsightWidget[] {
  const insight = widget.insight;
  if (!insight?.charts?.length) return [];

  const generation = insight.codeact_parts?.length
    ? { codeact_parts: insight.codeact_parts as CodeActPart[] }
    : undefined;

  return [...insight.charts]
    .sort((a, b) => a.position - b.position)
    .map((chart, index) => {
      const seriesFields = chart.series_fields ?? undefined;
      return {
        id: chart.id,
        type: CHART_TYPES.has(chart.chart_type)
          ? (chart.chart_type as InsightWidget["type"])
          : "table",
        title: (index === 0 && widget.config?.title) || chart.title,
        description: index === 0 ? (insight.insight_text ?? "") : "",
        data: chart.chart_data,
        xAxis: chart.x_axis,
        yAxis: chart.y_axis,
        ...(seriesFields?.length ? { seriesFields } : {}),
        ...(generation ? { generation } : {}),
        insightId: insight.id,
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

/**
 * Builds the self-contained map-widget config for manually adding a catalog
 * dataset to a dashboard (POST widgets, widget_type "map") — the counterpart
 * of the agent's add_map_widget snapshot. Returns `null` for datasets without
 * a resolved tile_url (view-only catalog entries), which the API would reject.
 */
export function datasetToMapWidgetConfig(
  dataset: DatasetInfo
): DashboardWidgetConfig | null {
  if (!dataset.tile_url) return null;
  return {
    default_view: "map",
    dataset: {
      dataset_id: dataset.dataset_id,
      dataset_name: dataset.dataset_name,
      tile_url: dataset.tile_url,
      ...(dataset.start_date ? { start_date: dataset.start_date } : {}),
      ...(dataset.end_date ? { end_date: dataset.end_date } : {}),
    },
  };
}

/**
 * The widget id of the map widget snapshotting `datasetId` on this dashboard
 * (agent- and panel-created widgets both carry `config.dataset.dataset_id`),
 * or undefined when the dataset isn't on the dashboard.
 */
export function findDatasetWidgetId(
  dashboard: Pick<Dashboard, "widgets">,
  datasetId: number
): string | undefined {
  return dashboard.widgets.find(
    (w) =>
      w.widget_type === "map" && w.config?.dataset?.dataset_id === datasetId
  )?.id;
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
