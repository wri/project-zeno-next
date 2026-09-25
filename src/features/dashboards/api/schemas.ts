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
  // The catalogue dataset a curated chart was computed from; absent on older
  // rows and on AI-generated charts.
  dataset_id: z.number().nullable().optional(),
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
  // Null (or absent, for a pre-sections backend) means the widget sits in the
  // ungrouped top-level list rendered above the first section.
  section_id: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  // A malformed insight payload degrades to the "not available" placeholder
  // (catch → null) rather than failing the whole dashboard parse.
  insight: DashboardInsightSchema.nullable().optional().catch(null),
});

// How an analysis template built a section. Provenance only: the section
// stays editable, so this says how it started, not what it holds now.
export const DashboardSectionTemplateSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown()).default({}),
  start_date: z.string(),
  end_date: z.string(),
  built_at: z.string(),
});

// One flat level of grouping. Widgets carry the back-reference
// (`section_id`); a section never nests inside another.
export const DashboardSectionResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  position: z.number(),
  // The BE emits null for a hand-composed section; a pre-templates backend
  // omits the key. Both settle to null here.
  template: DashboardSectionTemplateSchema.nullable().default(null),
  created_at: z.string(),
});

export const AnalysisTemplateSchema = z.object({
  name: z.string(),
  // Already in the user's language.
  label: z.string(),
  args_schema: z.record(z.string(), z.unknown()).default({}),
  widgets: z.array(z.string()).default([]),
});

export const AnalysisTemplateListSchema = z.array(AnalysisTemplateSchema);

export const DashboardResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  aois: z.array(DashboardAoiResponseSchema).default([]),
  // Defaults to [] so a pre-sections backend parses as "no sections".
  sections: z.array(DashboardSectionResponseSchema).default([]),
  // Flat across every container, so `position` alone does NOT give render
  // order — group with `widgetContainers` (model/dashboard-sections).
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
export type DashboardSection = z.infer<typeof DashboardSectionResponseSchema>;
export type DashboardSectionTemplate = z.infer<
  typeof DashboardSectionTemplateSchema
>;
export type AnalysisTemplate = z.infer<typeof AnalysisTemplateSchema>;
export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;
export type DashboardCreateRequest = z.infer<
  typeof DashboardCreateRequestSchema
>;
