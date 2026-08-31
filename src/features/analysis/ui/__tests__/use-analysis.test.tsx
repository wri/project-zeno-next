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

  it("generates a '{dataset} in {location}' title when the dataset name is known", async () => {
    const chart = {
      id: "c1",
      position: 0,
      type: "bar",
      title: "Whatever the chart calls itself",
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
      result.current.run({
        ...selection,
        dataset: { id: 4, name: "Tree cover loss" },
      });
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(sink.add).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: "Tree cover loss in Brazil" }),
      ])
    );
  });

  it("titles a TCL analysis's emissions chart by its own label, not the dataset's", async () => {
    // Mirrors the backend TCLChartGenerator: one loss chart + one GHG
    // emissions chart, distinguished by y-axis.
    const base = {
      position: 0,
      type: "bar",
      xAxis: "tree_cover_loss_year",
      colorField: "",
      stackField: "",
      groupField: "",
      data: [{ tree_cover_loss_year: "2020" }],
    };
    const charts = [
      {
        ...base,
        id: "c1",
        title: "Annual Tree Cover Loss",
        yAxis: "area_ha",
        seriesFields: ["area_ha"],
      },
      {
        ...base,
        id: "c2",
        position: 1,
        title: "Annual GHG Emissions from Tree Cover Loss",
        yAxis: "carbon_emissions_MgCO2e",
        seriesFields: ["carbon_emissions_MgCO2e"],
      },
    ];
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "r1", charts }),
    };
    const sink: InsightSink = { add: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service, sink));

    act(() => {
      result.current.run({
        ...selection,
        dataset: { id: 4, name: "Tree cover loss" },
      });
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(sink.add).toHaveBeenCalledWith([
      expect.objectContaining({ title: "Tree cover loss in Brazil" }),
      expect.objectContaining({
        title: "GHG Emissions from Tree Cover Loss in Brazil",
      }),
    ]);
  });

  it("titles the curated LGMS charts as the design names them", async () => {
    // The four charts LGMSChartGenerator returns: three time-series roll-ups
    // that collapse into one card, plus the hierarchy.
    const base = {
      position: 0,
      xAxis: "year",
      yAxis: "",
      colorField: "",
      stackField: "",
      groupField: "",
      seriesFields: [],
      data: [],
    };
    const charts = [
      {
        ...base,
        id: "c0",
        type: "stacked-bar-with-line",
        title: "Net GHG Flux — Full Detail",
      },
      {
        ...base,
        id: "c1",
        position: 1,
        type: "stacked-bar-with-line",
        title: "Net GHG Flux by Category",
      },
      {
        ...base,
        id: "c2",
        position: 2,
        type: "stacked-bar-with-line",
        title: "Net GHG Flux Summary",
      },
      {
        ...base,
        id: "c3",
        position: 3,
        type: "hierarchical-bar",
        xAxis: "",
        title: "Net GHG Flux — Annual Average",
      },
    ];
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "r1", charts }),
    };
    const sink: InsightSink = { add: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service, sink));

    act(() => {
      result.current.run({
        ...selection,
        dataset: { id: 4, name: "Land GHG Monitoring System (LGMS)" },
      });
    });

    await waitFor(() => expect(result.current.status).toBe("done"));

    const widgets = (sink.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // All three siblings share one title, so the heading can't flip as the
    // DETAIL pill changes which one is surfaced.
    expect(widgets.map((w: { title: string }) => w.title)).toEqual([
      "Net flux over time",
      "Net flux over time",
      "Net flux over time",
      "Net GHG flux (annual average)",
    ]);
    // ...but each keeps its own backend title, which is what the DETAIL pill
    // parses to label its three options.
    expect(
      widgets.map((w: { backendTitle?: string }) => w.backendTitle)
    ).toEqual([
      "Net GHG Flux — Full Detail",
      "Net GHG Flux by Category",
      "Net GHG Flux Summary",
      "Net GHG Flux — Annual Average",
    ]);
  });

  it("titles the curated charts even when the dataset name is unknown", async () => {
    const chart = {
      id: "c0",
      position: 0,
      type: "hierarchical-bar",
      title: "Net GHG Flux — Annual Average",
      xAxis: "",
      yAxis: "",
      colorField: "",
      stackField: "",
      groupField: "",
      seriesFields: [],
      data: [],
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
    expect(sink.add).toHaveBeenCalledWith([
      expect.objectContaining({ title: "Net GHG flux (annual average)" }),
    ]);
  });

  it("keeps the chart's own title when the dataset name is unknown", async () => {
    const chart = {
      id: "c1",
      position: 0,
      type: "bar",
      title: "Original chart title",
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
      // `selection.dataset` has no `name` (matches today's callers).
      result.current.run(selection);
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(sink.add).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: "Original chart title" }),
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
