import { describe, expect, it, vi } from "vitest";
import { RestAnalysisGateway } from "../rest-analysis-gateway";
import type { AnalysisSelection } from "../../model/analysis-selection";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface MockResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

function mockFetch(
  body: unknown,
  { status = 200, headers = {} }: MockResponseOptions = {}
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    json: () => Promise.resolve(body),
  });
}

const SELECTION: AnalysisSelection = {
  area: { name: "Brazil", source: "gadm", srcId: "BRA", subtype: "country" },
  dataset: { id: 4 },
  startDate: "2020-01-01",
  endDate: "2022-12-31",
};

const JOB_ID = "3ac814f6-5065-4da2-beb5-b683c2740c02";
const INSIGHT_ID = "e7021a4c-21ae-440a-a847-874cca10890c";
const RESOURCE_URL = `/api/insights/${INSIGHT_ID}`;

// ── submit ────────────────────────────────────────────────────────────────────

describe("RestAnalysisGateway.submit", () => {
  it("POSTs to /api/analyze and returns a JobRef", async () => {
    const fetch = mockFetch({ id: JOB_ID, status: "pending", resources: [] });
    const gateway = new RestAnalysisGateway(fetch);

    const result = await gateway.submit(SELECTION);

    expect(result).toEqual({ id: JOB_ID });
    expect(fetch).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("builds the request body from the AnalysisSelection", async () => {
    const fetch = mockFetch({ id: JOB_ID, status: "pending", resources: [] });
    const gateway = new RestAnalysisGateway(fetch);

    await gateway.submit(SELECTION);

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      aois: [{ source: "gadm", src_id: "BRA", subtype: "country" }],
      dataset_id: 4,
      start_date: "2020-01-01",
      end_date: "2022-12-31",
    });
  });

  it("throws when the backend returns a non-2xx status", async () => {
    const fetch = mockFetch({ detail: "Bad request" }, { status: 422 });
    const gateway = new RestAnalysisGateway(fetch);

    await expect(gateway.submit(SELECTION)).rejects.toMatchObject({
      status: 422,
    });
  });
});

// ── poll ──────────────────────────────────────────────────────────────────────

describe("RestAnalysisGateway.poll", () => {
  it("returns a pending outcome with retryAfterSecs from the Retry-After header", async () => {
    const fetch = mockFetch(
      { id: JOB_ID, status: "pending", resources: [] },
      { headers: { "Retry-After": "10" } }
    );
    const gateway = new RestAnalysisGateway(fetch);

    const outcome = await gateway.poll(JOB_ID);

    expect(outcome).toEqual({ status: "pending", retryAfterSecs: 10 });
  });

  it("returns a running outcome with retryAfterSecs from the Retry-After header", async () => {
    const fetch = mockFetch(
      { id: JOB_ID, status: "running", resources: [] },
      { headers: { "Retry-After": "3" } }
    );
    const gateway = new RestAnalysisGateway(fetch);

    const outcome = await gateway.poll(JOB_ID);

    expect(outcome).toEqual({ status: "running", retryAfterSecs: 3 });
  });

  it("defaults retryAfterSecs to 5 when the Retry-After header is absent", async () => {
    const fetch = mockFetch({ id: JOB_ID, status: "pending", resources: [] });
    const gateway = new RestAnalysisGateway(fetch);

    const outcome = await gateway.poll(JOB_ID);

    expect(outcome).toMatchObject({ retryAfterSecs: 5 });
  });

  it("overrides a zero Retry-After to 1 second", async () => {
    const fetch = mockFetch(
      { id: JOB_ID, status: "pending", resources: [] },
      { headers: { "Retry-After": "0" } }
    );
    const gateway = new RestAnalysisGateway(fetch);

    const outcome = await gateway.poll(JOB_ID);

    expect(outcome).toMatchObject({ retryAfterSecs: 1 });
  });

  it("overrides a negative Retry-After to 1 second", async () => {
    const fetch = mockFetch(
      { id: JOB_ID, status: "pending", resources: [] },
      { headers: { "Retry-After": "-5" } }
    );
    const gateway = new RestAnalysisGateway(fetch);

    const outcome = await gateway.poll(JOB_ID);

    expect(outcome).toMatchObject({ retryAfterSecs: 1 });
  });

  it("returns a completed outcome with mapped resources", async () => {
    const fetch = mockFetch({
      id: JOB_ID,
      status: "completed",
      resources: [
        {
          id: "aa774e4b-f866-4f47-976b-fd4d42dd68f7",
          resource_url: RESOURCE_URL,
          status: "completed",
        },
      ],
    });
    const gateway = new RestAnalysisGateway(fetch);

    const outcome = await gateway.poll(JOB_ID);

    expect(outcome).toEqual({
      status: "completed",
      resources: [
        {
          id: "aa774e4b-f866-4f47-976b-fd4d42dd68f7",
          resourceUrl: RESOURCE_URL,
          status: "completed",
        },
      ],
    });
  });

  it("GETs /api/jobs/{id}", async () => {
    const fetch = mockFetch({ id: JOB_ID, status: "pending", resources: [] });
    const gateway = new RestAnalysisGateway(fetch);

    await gateway.poll(JOB_ID);

    expect(fetch).toHaveBeenCalledWith(
      `/api/jobs/${JOB_ID}`,
      expect.objectContaining({})
    );
  });

  it("throws when the backend returns a non-2xx status", async () => {
    const fetch = mockFetch({ detail: "Not found" }, { status: 404 });
    const gateway = new RestAnalysisGateway(fetch);

    await expect(gateway.poll(JOB_ID)).rejects.toMatchObject({ status: 404 });
  });
});

// ── fetchResult ───────────────────────────────────────────────────────────────

describe("RestAnalysisGateway.fetchResult", () => {
  it("maps the insight response to an AnalysisResult", async () => {
    const fetch = mockFetch({
      id: INSIGHT_ID,
      charts: [
        {
          title: "Annual Tree Cover Loss",
          chart_type: "bar",
          x_axis: "tree_cover_loss_year",
          y_axis: "area_ha",
          chart_data: [{ tree_cover_loss_year: 2020, area_ha: 2603663.52 }],
        },
      ],
    });
    const gateway = new RestAnalysisGateway(fetch);

    const result = await gateway.fetchResult(RESOURCE_URL);

    expect(result.id).toBe(INSIGHT_ID);
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0]).toMatchObject({
      title: "Annual Tree Cover Loss",
      type: "bar",
      xAxis: "tree_cover_loss_year",
      yAxis: "area_ha",
      data: [{ tree_cover_loss_year: 2020, area_ha: 2603663.52 }],
    });
  });

  it("assigns position from the chart's array index", async () => {
    const fetch = mockFetch({
      id: INSIGHT_ID,
      charts: [
        {
          title: "A",
          chart_type: "bar",
          x_axis: "x",
          y_axis: "y",
          chart_data: [],
        },
        {
          title: "B",
          chart_type: "line",
          x_axis: "x",
          y_axis: "y",
          chart_data: [],
        },
      ],
    });
    const gateway = new RestAnalysisGateway(fetch);

    const result = await gateway.fetchResult(RESOURCE_URL);

    expect(result.charts[0].position).toBe(0);
    expect(result.charts[1].position).toBe(1);
  });

  it("defaults optional chart fields to empty values when absent", async () => {
    const fetch = mockFetch({
      id: INSIGHT_ID,
      charts: [
        {
          title: "A",
          chart_type: "bar",
          x_axis: "x",
          y_axis: "y",
          chart_data: [],
        },
      ],
    });
    const gateway = new RestAnalysisGateway(fetch);

    const result = await gateway.fetchResult(RESOURCE_URL);
    const chart = result.charts[0];

    expect(chart.colorField).toBe("");
    expect(chart.stackField).toBe("");
    expect(chart.groupField).toBe("");
    expect(chart.seriesFields).toEqual([]);
  });

  it("GETs the resource URL as provided", async () => {
    const fetch = mockFetch({ id: INSIGHT_ID, charts: [] });
    const gateway = new RestAnalysisGateway(fetch);

    await gateway.fetchResult(RESOURCE_URL);

    expect(fetch).toHaveBeenCalledWith(
      RESOURCE_URL,
      expect.objectContaining({})
    );
  });

  it("throws when the backend returns a non-2xx status", async () => {
    const fetch = mockFetch({ detail: "Not found" }, { status: 404 });
    const gateway = new RestAnalysisGateway(fetch);

    await expect(gateway.fetchResult(RESOURCE_URL)).rejects.toMatchObject({
      status: 404,
    });
  });
});
