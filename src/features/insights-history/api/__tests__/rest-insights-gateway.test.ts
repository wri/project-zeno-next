import { describe, expect, it, vi } from "vitest";
import { RestInsightsGateway } from "../rest-insights-gateway";

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const rawInsight = {
  id: "ins-1",
  insight_text: "Tree cover loss in Brazil.",
  created_at: "2024-05-01T00:00:00.000Z",
  is_public: false, // unknown-to-us field — must be tolerated, not rejected
  charts: [
    {
      id: "ch-1",
      title: "Annual tree cover loss",
      chart_type: "bar",
      x_axis: "year",
      y_axis: "value",
      series_fields: ["value"],
      chart_data: [{ year: "2020", value: 10 }],
    },
  ],
};

describe("RestInsightsGateway.list", () => {
  it("maps rows to InsightRecords", async () => {
    const fetch = mockFetch([rawInsight]);
    const records = await new RestInsightsGateway(fetch).list();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: "ins-1",
      createdAt: "2024-05-01T00:00:00.000Z",
      insightText: "Tree cover loss in Brazil.",
      verification: "ai-generated",
    });
    // The real payload has no insight-level title/source.
    expect(records[0].source).toBeUndefined();
    expect(records[0].charts[0]).toMatchObject({
      id: "ch-1",
      type: "bar",
      title: "Annual tree cover loss",
      xAxis: "year",
      yAxis: "value",
    });
  });

  it("appends ?thread_id when a thread is given", async () => {
    const fetch = mockFetch([]);
    await new RestInsightsGateway(fetch).list({ threadId: "t 1" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/insights?thread_id=t+1",
      expect.anything()
    );
  });

  it("appends aoi_source + aoi_id together when scoped to an area", async () => {
    const fetch = mockFetch([]);
    await new RestInsightsGateway(fetch).list({
      aoiSource: "gadm",
      aoiId: "BRA.1_1",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/insights?aoi_source=gadm&aoi_id=BRA.1_1",
      expect.anything()
    );
  });

  it("omits an AOI param unless both source and id are present", async () => {
    const fetch = mockFetch([]);
    await new RestInsightsGateway(fetch).list({ aoiSource: "gadm" });
    expect(fetch).toHaveBeenCalledWith("/api/insights", expect.anything());
  });

  it("omits the query when unfiltered", async () => {
    const fetch = mockFetch([]);
    await new RestInsightsGateway(fetch).list({ threadId: null });
    expect(fetch).toHaveBeenCalledWith("/api/insights", expect.anything());
  });

  it("returns an empty list on 401 (unauthenticated)", async () => {
    const fetch = mockFetch({ error: "unauthorized" }, 401);
    expect(await new RestInsightsGateway(fetch).list()).toEqual([]);
  });

  it("drops a malformed row and keeps the good ones", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = mockFetch([rawInsight, { title: "no id" }]);

    const records = await new RestInsightsGateway(fetch).list();

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("ins-1");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("synthesises a chart id when the payload omits one", async () => {
    const fetch = mockFetch([
      { id: "ins-2", charts: [{ chart_type: "line" }] },
    ]);
    const records = await new RestInsightsGateway(fetch).list();
    expect(records[0].charts[0].id).toBe("ins-2-chart-0");
  });
});
