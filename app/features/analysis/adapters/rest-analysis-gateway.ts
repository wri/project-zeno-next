import { apiFetch } from "@/app/lib/api-client";
import type {
  AnalysisGateway,
  JobRef,
  JobResource,
  PollOutcome,
} from "../application/analysis-gateway";
import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";
import type { ChartDTO } from "../domain/chart-dto";

// ── Raw API shapes (anti-corruption layer — never leave this file) ─────────────

interface RawJobResource {
  id: string;
  resource_url: string;
  status: string;
}

interface RawJobResponse {
  id: string;
  status: "pending" | "running" | "completed";
  resources: RawJobResource[];
}

interface RawChart {
  title: string;
  chart_type: string;
  x_axis: string;
  y_axis: string;
  color_field?: string;
  stack_field?: string;
  group_field?: string;
  series_fields?: string[];
  chart_data: Record<string, unknown>[];
}

interface RawInsightResponse {
  id: string;
  charts: RawChart[];
}

// ── Adapter ───────────────────────────────────────────────────────────────────

type FetchFn = typeof apiFetch;

/** Fallback when the backend omits the retry guidance. */
const DEFAULT_RETRY_AFTER_SECS = 5;

/**
 * Driven adapter that implements `AnalysisGateway` over the REST backend.
 * The only place in the codebase that knows status codes, headers, and the
 * backend's snake_case field names (ADR 0003).
 *
 * `fetch` is injected so the adapter is testable without module mocking or a
 * live network.
 */
export class RestAnalysisGateway implements AnalysisGateway {
  constructor(private readonly fetch: FetchFn = apiFetch) {}

  async submit(selection: AnalysisSelection): Promise<JobRef> {
    const response = await this.fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aois: [
          {
            source: selection.area.source,
            src_id: selection.area.srcId,
            subtype: selection.area.subtype,
          },
        ],
        dataset_id: selection.dataset.id,
        start_date: selection.startDate,
        end_date: selection.endDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis submission failed: ${response.status}`);
    }

    const body = (await response.json()) as { id: string };
    return { id: body.id };
  }

  async poll(jobId: string): Promise<PollOutcome> {
    const response = await this.fetch(`/api/jobs/${jobId}`);

    if (!response.ok) {
      throw new Error(`Job poll failed: ${response.status}`);
    }

    const body = (await response.json()) as RawJobResponse;

    if (body.status === "completed") {
      return {
        status: "completed",
        resources: body.resources.map(
          (r): JobResource => ({
            id: r.id,
            resourceUrl: r.resource_url,
            status: r.status,
          })
        ),
      };
    }

    const retryAfterRaw = response.headers.get("Retry-After");
    const parsed = retryAfterRaw
      ? parseInt(retryAfterRaw, 10)
      : DEFAULT_RETRY_AFTER_SECS;
    const retryAfterSecs = parsed > 0 ? parsed : 1;

    return { status: body.status, retryAfterSecs };
  }

  async fetchResult(resourceUrl: string): Promise<AnalysisResult> {
    const response = await this.fetch(resourceUrl);

    if (!response.ok) {
      throw new Error(`Result fetch failed: ${response.status}`);
    }

    const body = (await response.json()) as RawInsightResponse;

    return {
      id: body.id,
      charts: body.charts.map(
        (c, i): ChartDTO => ({
          id: `${body.id}-chart-${i}`,
          position: i,
          title: c.title,
          type: c.chart_type,
          xAxis: c.x_axis,
          yAxis: c.y_axis,
          colorField: c.color_field ?? "",
          stackField: c.stack_field ?? "",
          groupField: c.group_field ?? "",
          seriesFields: c.series_fields ?? [],
          data: c.chart_data,
        })
      ),
    };
  }
}
