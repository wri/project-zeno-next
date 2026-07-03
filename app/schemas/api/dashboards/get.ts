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

export const DashboardInsightSchema = z.object({
  id: z.string(),
  insight_text: z.string().nullish(),
  charts: z.array(DashboardChartSchema),
  created_at: z.string(),
});

export const DashboardWidgetConfigSchema = z
  .object({
    default_view: z.string(),
    title: z.string(),
    dataset_id: z.number(),
    start_date: z.string(),
    end_date: z.string(),
  })
  .partial();

export const DashboardWidgetSchema = z.object({
  id: z.string(),
  position: z.number(),
  widget_type: z.enum(["insight", "map"]),
  insight_id: z.string().nullish(),
  config: DashboardWidgetConfigSchema.nullish(),
  // null when the referenced insight is not visible to this viewer — the UI
  // must render a "not available" placeholder, not an error.
  insight: DashboardInsightSchema.nullish(),
});

export const DashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  widgets: z.array(DashboardWidgetSchema),
});

export const ListDashboardsResponseSchema = z.array(DashboardSchema);

export type DashboardChart = z.infer<typeof DashboardChartSchema>;
export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type ListDashboardsResponse = z.infer<
  typeof ListDashboardsResponseSchema
>;
