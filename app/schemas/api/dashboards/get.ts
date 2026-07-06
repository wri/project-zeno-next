import { z } from "zod";

// Schemas are deliberately permissive: only the fields the dashboard UI
// renders are parsed; everything else the backend sends is passed through
// untyped. Contract: project-zeno docs/dashboards-frontend-handoff.md.

export const DashboardChartSchema = z.object({
  id: z.string(),
  position: z.number(),
  title: z.string(),
  chart_type: z.string(),
  x_axis: z.string(),
  y_axis: z.string(),
  series_fields: z.array(z.string()).nullish(),
  chart_data: z.unknown(),
});

// Provenance parts (base64-encoded) powering the "view how this was
// generated" drawer; same shape as CodeActPart in app/types/chat.ts.
export const DashboardCodeActPartSchema = z.object({
  type: z.string(),
  content: z.string(),
});

export const DashboardInsightSchema = z.object({
  id: z.string(),
  insight_text: z.string().nullish(),
  charts: z.array(DashboardChartSchema),
  codeact_parts: z.array(DashboardCodeActPartSchema).nullish(),
  created_at: z.string(),
});

// Map widget config sub-objects (docs/dashboards-map-widgets-handoff.md).
// Exactly one of `dataset` / `imagery` is present on a valid map widget;
// both are self-contained snapshots whose `tile_url` renders directly.
export const MapWidgetContextLayerSchema = z.object({
  name: z.string(),
  tile_url: z.string(),
  // Present on vector context layers (mirrors DatasetInfo.context_layers).
  source_layer: z.string().nullish(),
  type: z.string().nullish(),
});

export const MapWidgetDatasetSchema = z.object({
  dataset_name: z.string().nullish(),
  tile_url: z.string().nullish(),
  context_layer: z.string().nullish(),
  context_layers: z.array(MapWidgetContextLayerSchema).nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
});

export const MapWidgetImagerySchema = z.object({
  tile_url: z.string().nullish(),
  tilejson_url: z.string().nullish(),
  target_date: z.string().nullish(),
  aoi_names: z.array(z.string()).nullish(),
});

export const DashboardWidgetConfigSchema = z
  .object({
    default_view: z.string(),
    title: z.string(),
    dataset: MapWidgetDatasetSchema.nullable(),
    imagery: MapWidgetImagerySchema.nullable(),
    // Markdown body of a text widget.
    text: z.string().nullable(),
  })
  .partial();

// Widget kinds this UI knows how to render. `widget_type` is deliberately an
// open string: a dashboard containing a widget kind added by a newer backend
// must still parse — unknown kinds render an "unsupported" placeholder.
export const KNOWN_WIDGET_TYPES = ["insight", "map", "text"] as const;

export const DashboardWidgetSchema = z.object({
  id: z.string(),
  position: z.number(),
  widget_type: z.string(),
  insight_id: z.string().nullish(),
  config: DashboardWidgetConfigSchema.nullish(),
  // null when the referenced insight is not visible to this viewer — the UI
  // must render a "not available" placeholder, not an error.
  insight: DashboardInsightSchema.nullish(),
});

export const DashboardAoiSchema = z.object({
  source: z.string(),
  src_id: z.string(),
  name: z.string(),
  subtype: z.string().nullish(),
});

export const DashboardSchema = z.object({
  id: z.string(),
  // Owner id — compared against the logged-in user to gate edit affordances
  // on publicly viewable dashboards.
  user_id: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  // Map widgets fit their viewport to the dashboard's area (single-area MVP).
  aois: z.array(DashboardAoiSchema).nullish(),
  widgets: z.array(DashboardWidgetSchema),
});

export const ListDashboardsResponseSchema = z.array(DashboardSchema);

export type DashboardChart = z.infer<typeof DashboardChartSchema>;
export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type DashboardAoi = z.infer<typeof DashboardAoiSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type ListDashboardsResponse = z.infer<
  typeof ListDashboardsResponseSchema
>;
