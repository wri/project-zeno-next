import { describe, expect, it, vi } from "vitest";
import { DatasetOverrideGateway } from "../dataset-override-gateway";
import type { AnalysisGateway } from "../../model/analysis-gateway";
import type { AnalysisSelection } from "../../model/analysis-selection";
import type { AnalysisResult } from "../../model/analysis-result";

const REAL_DATASET_SELECTION: AnalysisSelection = {
  area: { name: "Brazil", source: "gadm", srcId: "BRA", subtype: "country" },
  dataset: { id: 4 },
  startDate: "2020-01-01",
  endDate: "2022-12-31",
};

const OVERRIDDEN_SELECTION: AnalysisSelection = {
  ...REAL_DATASET_SELECTION,
  dataset: { id: 12 },
};

const CANNED_RESULT: AnalysisResult = {
  id: "canned",
  charts: [
    {
      id: "chart-1",
      position: 0,
      title: "Net flux over time",
      type: "stacked-bar-with-line",
      xAxis: "year",
      yAxis: "net_flux_mt",
      colorField: "",
      stackField: "category",
      groupField: "",
      seriesFields: ["Net flux"],
      data: [{ year: 2020, "Net flux": 850 }],
    },
  ],
};

function fakeRealGateway(): AnalysisGateway {
  return {
    submit: vi.fn().mockResolvedValue({ id: "real-job" }),
    poll: vi.fn().mockResolvedValue({
      status: "completed",
      resources: [
        {
          id: "real-job",
          resourceUrl: "/api/insights/real",
          status: "completed",
        },
      ],
    }),
    fetchResult: vi.fn().mockResolvedValue({ id: "real-result", charts: [] }),
  };
}

describe("DatasetOverrideGateway", () => {
  it("passes non-overridden dataset ids straight through to the real gateway", async () => {
    const real = fakeRealGateway();
    const gateway = new DatasetOverrideGateway(real, { 12: CANNED_RESULT });

    const job = await gateway.submit(REAL_DATASET_SELECTION);
    expect(real.submit).toHaveBeenCalledWith(REAL_DATASET_SELECTION, undefined);
    expect(job).toEqual({ id: "real-job" });

    const outcome = await gateway.poll(job.id);
    expect(real.poll).toHaveBeenCalledWith("real-job", undefined);
    expect(outcome.status).toBe("completed");

    if (outcome.status === "completed") {
      const result = await gateway.fetchResult(
        outcome.resources[0].resourceUrl
      );
      expect(real.fetchResult).toHaveBeenCalled();
      expect(result).toEqual({ id: "real-result", charts: [] });
    }
  });

  it("short-circuits an overridden dataset id without touching the real gateway", async () => {
    const real = fakeRealGateway();
    const gateway = new DatasetOverrideGateway(real, { 12: CANNED_RESULT });

    const job = await gateway.submit(OVERRIDDEN_SELECTION);
    expect(real.submit).not.toHaveBeenCalled();

    const outcome = await gateway.poll(job.id);
    expect(real.poll).not.toHaveBeenCalled();
    expect(outcome.status).toBe("completed");

    if (outcome.status === "completed") {
      const result = await gateway.fetchResult(
        outcome.resources[0].resourceUrl
      );
      expect(real.fetchResult).not.toHaveBeenCalled();
      expect(result).toBe(CANNED_RESULT);
    }
  });

  it("issues a distinct job id per submission so concurrent runs don't collide", async () => {
    const real = fakeRealGateway();
    const gateway = new DatasetOverrideGateway(real, { 12: CANNED_RESULT });

    const jobA = await gateway.submit(OVERRIDDEN_SELECTION);
    const jobB = await gateway.submit(OVERRIDDEN_SELECTION);
    expect(jobA.id).not.toBe(jobB.id);
  });
});
