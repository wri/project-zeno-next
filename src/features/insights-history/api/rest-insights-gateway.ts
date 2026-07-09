import { z } from "zod";
import { apiFetch } from "@/app/lib/api-client";
import type { Chart, InsightRecord } from "@/src/entities/insight";
import type { InsightsGateway } from "../model/insights-gateway";

// ── Raw API shapes (anti-corruption layer — never leave this file) ─────────────
// Tolerant by design: chart fields default so a sparse row still parses; only a
// missing/!string `id` drops the row (it's unrenderable without one).

const RawChartSchema = z.object({
  id: z.string().optional(),
  title: z.string().default(""),
  chart_type: z.string().default("bar"),
  x_axis: z.string().default(""),
  y_axis: z.string().default(""),
  color_field: z.string().default(""),
  stack_field: z.string().default(""),
  group_field: z.string().default(""),
  series_fields: z.array(z.string()).default([]),
  chart_data: z.array(z.record(z.string(), z.unknown())).default([]),
});

const RawInsightSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  dataset: z.string().optional(),
  source: z.string().optional(),
  insight_text: z.string().optional(),
  created_at: z.string().optional(),
  charts: z.array(RawChartSchema).default([]),
});

type RawInsight = z.infer<typeof RawInsightSchema>;

function toInsightRecord(raw: RawInsight): InsightRecord {
  const charts: Chart[] = raw.charts.map((c, i) => ({
    id: c.id ?? `${raw.id}-chart-${i}`,
    position: i,
    title: c.title,
    type: c.chart_type,
    xAxis: c.x_axis,
    yAxis: c.y_axis,
    colorField: c.color_field,
    stackField: c.stack_field,
    groupField: c.group_field,
    seriesFields: c.series_fields,
    data: c.chart_data,
  }));

  return {
    id: raw.id,
    title: raw.title ?? charts[0]?.title ?? "Insight",
    source: raw.source ?? raw.dataset ?? "",
    createdAt: raw.created_at ?? "",
    verification: "ai-generated",
    insightText: raw.insight_text,
    charts,
  };
}

// ── Adapter ───────────────────────────────────────────────────────────────────

type FetchFn = typeof apiFetch;

/**
 * Driven adapter implementing `InsightsGateway` over `GET /api/insights`.
 * The only place that knows the endpoint, status codes, and snake_case shape.
 * `fetch` is injected so it's testable without a live network.
 */
export class RestInsightsGateway implements InsightsGateway {
  constructor(private readonly fetch: FetchFn = apiFetch) {}

  async list(
    threadId?: string | null,
    signal?: AbortSignal
  ): Promise<InsightRecord[]> {
    const query = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : "";
    const response = await this.fetch(`/api/insights${query}`, { signal });

    // Unauthenticated → empty list (the panel renders a signed-out empty state).
    if (response.status === 401) return [];
    if (!response.ok) {
      throw new Error(`Failed to load insights: ${response.status}`);
    }

    const body: unknown = await response.json();
    const rows = Array.isArray(body) ? body : [];

    // Validate per-row: a malformed row is dropped + logged, never blanks the list.
    const records: InsightRecord[] = [];
    rows.forEach((row, i) => {
      const parsed = RawInsightSchema.safeParse(row);
      if (parsed.success) {
        records.push(toInsightRecord(parsed.data));
      } else {
        console.warn(
          `[RestInsightsGateway] dropped malformed insight row ${i}`,
          parsed.error.issues
        );
      }
    });
    return records;
  }
}
