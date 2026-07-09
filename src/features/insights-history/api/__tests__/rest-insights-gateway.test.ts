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
  title: "Tree cover loss",
  source: "GFW",
  created_at: "2024-05-01T00:00:00.000Z",
  charts: [
    {
      id: "ch-1",
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
      title: "Tree cover loss",
      source: "GFW",
      createdAt: "2024-05-01T00:00:00.000Z",
      verification: "ai-generated",
    });
    expect(records[0].charts[0]).toMatchObject({
      id: "ch-1",
      type: "bar",
      xAxis: "year",
      yAxis: "value",
    });
  });

  it("appends ?thread_id when a thread is given", async () => {
    const fetch = mockFetch([]);
    await new RestInsightsGateway(fetch).list("t 1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/insights?thread_id=t%201",
      expect.anything()
    );
  });

  it("omits the query when threadId is null (unfiltered)", async () => {
    const fetch = mockFetch([]);
    await new RestInsightsGateway(fetch).list(null);
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
