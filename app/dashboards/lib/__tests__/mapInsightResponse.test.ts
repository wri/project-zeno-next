import { describe, it, expect } from "vitest";
import {
  InsightResponseSchema,
  ListInsightsResponseSchema,
} from "@/app/schemas/api/insights/get";
import { mapInsightsResponse } from "@/app/dashboards/lib/mapInsightResponse";

// A representative GET /api/insights row. `thread_id` is intentionally null:
// InsightOrm.thread_id is nullable and the response model types it
// Optional[str], so the API returns null for insights generated outside a
// thread. A non-nullable `thread_id: z.string()` once made the whole array
// fail to parse, which silently blanked the Analyses pane even when the user
// had many insights.
const insightWithNullThread = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-1",
  thread_id: null,
  insight_text: "Tree cover loss fell 30% over the period.",
  follow_up_suggestions: [],
  statistics_ids: [],
  charts: [
    {
      id: "22222222-2222-2222-2222-222222222222",
      position: 0,
      title: "Tree cover loss by year",
      chart_type: "line",
      x_axis: "year",
      y_axis: "area_ha",
      color_field: "",
      stack_field: "",
      group_field: "",
      series_fields: [],
      chart_data: [{ year: 2020, area_ha: 100 }],
    },
  ],
  codeact_parts: [],
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
};

describe("InsightResponseSchema", () => {
  it("accepts a null thread_id (insight generated outside a thread)", () => {
    expect(InsightResponseSchema.safeParse(insightWithNullThread).success).toBe(
      true
    );
  });

  it("accepts a missing thread_id", () => {
    const rest = { ...insightWithNullThread } as Record<string, unknown>;
    delete rest.thread_id;
    expect(InsightResponseSchema.safeParse(rest).success).toBe(true);
  });
});

describe("mapInsightsResponse", () => {
  it("flattens charts to InsightWidgets even when thread_id is null", () => {
    const widgets = mapInsightsResponse(
      ListInsightsResponseSchema.parse([insightWithNullThread])
    );
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toMatchObject({
      id: "22222222-2222-2222-2222-222222222222",
      type: "line",
      title: "Tree cover loss by year",
      description: "Tree cover loss fell 30% over the period.",
      xAxis: "year",
      yAxis: "area_ha",
    });
  });
});
