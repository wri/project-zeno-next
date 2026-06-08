import { describe, expect, it, vi } from "vitest";
import { StubAnalysisService } from "../stub-analysis-service";

describe("StubAnalysisService", () => {
  it("resolves a canned result derived from the selection's id", async () => {
    const service = new StubAnalysisService(0);

    const result = await service.run({
      name: "Brazil",
      source: "gadm",
      srcId: "BRA",
    });

    expect(result).toMatchObject({ id: "stub:gadm:BRA" });
  });

  it("returns a canned result with exactly two charts", async () => {
    const service = new StubAnalysisService(0);

    const result = await service.run({
      name: "Brazil",
      source: "gadm",
      srcId: "BRA",
    });

    expect(result.charts).toHaveLength(2);
  });

  it("returns charts with the InsightChartResponse field shape", async () => {
    const service = new StubAnalysisService(0);

    const result = await service.run({
      name: "Brazil",
      source: "gadm",
      srcId: "BRA",
    });

    for (const chart of result.charts) {
      expect(chart).toMatchObject({
        id: expect.any(String),
        position: expect.any(Number),
        title: expect.any(String),
        type: expect.any(String),
        xAxis: expect.any(String),
        yAxis: expect.any(String),
        colorField: expect.any(String),
        stackField: expect.any(String),
        groupField: expect.any(String),
        seriesFields: expect.any(Array),
        data: expect.any(Array),
      });
    }
  });

  it("falls back to the name when the selection has no id", async () => {
    const service = new StubAnalysisService(0);

    const result = await service.run({ name: "My Area", source: "custom" });

    expect(result).toMatchObject({ id: "stub:custom:My Area" });
  });

  it("waits for the configured delay before resolving", async () => {
    vi.useFakeTimers();
    try {
      const service = new StubAnalysisService(1000);
      let resolved = false;
      const promise = service
        .run({ name: "Brazil", source: "gadm", srcId: "BRA" })
        .then((result) => {
          resolved = true;
          return result;
        });

      await vi.advanceTimersByTimeAsync(999);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(resolved).toBe(true);
      await expect(promise).resolves.toMatchObject({ id: "stub:gadm:BRA" });
    } finally {
      vi.useRealTimers();
    }
  });
});
