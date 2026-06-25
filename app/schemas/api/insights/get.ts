import { z } from "zod";

// Mirrors the backend InsightChartResponse (src/api/schemas.py). One persisted
// insight owns many charts; chart_data rows are freeform objects consumed as
// `unknown` by the widget renderers, so they are left loosely typed here.
export const InsightChartResponseSchema = z.object({
  id: z.string(),
  position: z.number(),
  title: z.string(),
  chart_type: z.string(),
  x_axis: z.string(),
  y_axis: z.string(),
  color_field: z.string(),
  stack_field: z.string(),
  group_field: z.string(),
  series_fields: z.array(z.string()),
  chart_data: z.array(z.record(z.string(), z.unknown())),
});

export const CodeActPartResponseSchema = z.object({
  type: z.string(),
  content: z.string(),
});

// Mirrors the backend InsightResponse from GET /api/insights.
export const InsightResponseSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable().optional(),
  thread_id: z.string(),
  insight_text: z.string(),
  follow_up_suggestions: z.array(z.string()),
  statistics_ids: z.array(z.string()),
  charts: z.array(InsightChartResponseSchema),
  codeact_parts: z.array(CodeActPartResponseSchema),
  is_public: z.boolean(),
  created_at: z.string(),
});

export const ListInsightsResponseSchema = z.array(InsightResponseSchema);

export type InsightChartResponse = z.infer<typeof InsightChartResponseSchema>;
export type InsightResponse = z.infer<typeof InsightResponseSchema>;
export type ListInsightsResponse = z.infer<typeof ListInsightsResponseSchema>;
