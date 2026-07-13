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

export const DashboardWidgetResponseSchema = z.object({
  id: z.string(),
  position: z.number(),
  widget_type: z.string(),
  insight_id: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  insight: z.unknown().nullable().optional(),
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
export type DashboardCreateRequest = z.infer<
  typeof DashboardCreateRequestSchema
>;
