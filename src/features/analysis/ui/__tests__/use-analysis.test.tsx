// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisService } from "../../model/analysis-service";
import type { AnalysisSelection } from "../../model/analysis-selection";
import type { InsightSink } from "../../model/insight-sink";
import { useAnalysis } from "../use-analysis";

const selection: AnalysisSelection = {
  area: { name: "Brazil", source: "gadm", srcId: "BRA", subtype: "country" },
  dataset: { id: 4 },
  startDate: "2020-01-01",
  endDate: "2022-12-31",
};

describe("useAnalysis", () => {
  it("starts idle with no result", () => {
    const service: AnalysisService = { run: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service));

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });

  it("runs an analysis and surfaces the result", async () => {
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "analysis-1", charts: [] }),
    };
    const { result } = renderHook(() => useAnalysis(service));

    act(() => {
      result.current.run(selection);
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.result).toMatchObject({ id: "analysis-1" });
    expect(service.run).toHaveBeenCalledWith(
      selection,
      expect.any(AbortSignal)
    );
  });

  it("surfaces an error when the analysis fails", async () => {
    const boom = new Error("backend exploded");
    const service: AnalysisService = {
      run: vi.fn().mockRejectedValue(boom),
    };
    const { result } = renderHook(() => useAnalysis(service));

    act(() => {
      result.current.run(selection);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe(boom);
    expect(result.current.result).toBeNull();
  });

  it("resets result to null when run is called a second time", async () => {
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "analysis-1", charts: [] }),
    };
    const { result } = renderHook(() => useAnalysis(service));

    act(() => {
      result.current.run(selection);
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.result).not.toBeNull();

    // Second run should clear the previous result while running.
    act(() => {
      result.current.run(selection);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.status).toBe("running");
  });

  it("returns to idle and clears error when cancel is called during a run", async () => {
    let rejectRun!: (reason: unknown) => void;
    const service: AnalysisService = {
      run: vi.fn().mockReturnValue(
        new Promise<never>((_, reject) => {
          rejectRun = reject;
        })
      ),
    };
    const { result } = renderHook(() => useAnalysis(service));

    act(() => {
      result.current.run(selection);
    });

    expect(result.current.status).toBe("running");

    act(() => {
      result.current.cancel();
      // Simulate the service honouring the abort signal.
      rejectRun(new DOMException("Aborted", "AbortError"));
    });

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("cancel is a no-op when idle", () => {
    const service: AnalysisService = { run: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service));

    // Should not throw.
    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe("idle");
  });

  it("calls sink.add with mapped widgets when the analysis returns charts", async () => {
    const chart = {
      id: "c1",
      position: 0,
      type: "bar",
      title: "Tree cover loss",
      xAxis: "year",
      yAxis: "area_ha",
      colorField: "",
      stackField: "",
      groupField: "",
      seriesFields: ["area_ha"],
      data: [{ year: "2020", area_ha: 100 }],
    };
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "r1", charts: [chart] }),
    };
    const sink: InsightSink = { add: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service, sink));

    act(() => {
      result.current.run(selection);
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(sink.add).toHaveBeenCalledTimes(1);
    expect(sink.add).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "c1", type: "bar" }),
      ])
    );
  });

  it("calls sink.add with an empty array when the analysis returns no charts", async () => {
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "r1", charts: [] }),
    };
    const sink: InsightSink = { add: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service, sink));

    act(() => {
      result.current.run(selection);
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(sink.add).toHaveBeenCalledWith([]);
  });

  it("initialises idle when no service is injected (composition root wires without error)", () => {
    const { result } = renderHook(() => useAnalysis());
    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });
});
