import { z } from "zod";

export const AoiSearchResultSchema = z.object({
  source: z.string(),
  src_id: z.string(),
  name: z.string(),
  subtype: z.string(),
  bbox: z.array(z.number()).optional(),
});

export const AoiSearchResponseSchema = z.array(AoiSearchResultSchema);

export const DashboardAoiSchema = z.object({
  source: z.string(),
  src_id: z.string(),
  subtype: z.string(),
  name: z.string(),
});

export const DashboardAoiResponseSchema = DashboardAoiSchema.extend({
  id: z.string(),
  position: z.number(),
});

// One chart of a widget's expanded insight (GET /api/dashboards/:id).
// Deliberately lenient — everything the UI doesn't strictly need has a
// default, so a new backend field or a missing one never fails the page.
export const DashboardInsightChartSchema = z.object({
  id: z.string(),
  position: z.number().default(0),
  title: z.string().default(""),
  chart_type: z.string().default("table"),
  x_axis: z.string().default(""),
  y_axis: z.string().default(""),
  series_fields: z.array(z.string()).nullable().optional(),
  chart_data: z.unknown(),
});

export const DashboardInsightSchema = z.object({
  id: z.string(),
  insight_text: z.string().nullable().optional(),
  codeact_parts: z.array(z.unknown()).nullable().optional(),
  charts: z.array(DashboardInsightChartSchema).default([]),
});

export const DashboardWidgetResponseSchema = z.object({
  id: z.string(),
  position: z.number(),
  widget_type: z.string(),
  insight_id: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  // A malformed insight payload degrades to the "not available" placeholder
  // (catch → null) rather than failing the whole dashboard parse.
  insight: DashboardInsightSchema.nullable().optional().catch(null),
});

export const DashboardResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  aois: z.array(DashboardAoiResponseSchema).default([]),
  widgets: z.array(DashboardWidgetResponseSchema).default([]),
});

export const DashboardListResponseSchema = z.array(DashboardResponseSchema);

export const DashboardCreateRequestSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  aois: z.array(DashboardAoiSchema).min(1).max(1),
});

export type AoiSearchResult = z.infer<typeof AoiSearchResultSchema>;
export type DashboardAoi = z.infer<typeof DashboardAoiSchema>;
export type Dashboard = z.infer<typeof DashboardResponseSchema>;
export type DashboardWidget = z.infer<typeof DashboardWidgetResponseSchema>;
export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;
export type DashboardCreateRequest = z.infer<
  typeof DashboardCreateRequestSchema
>;
