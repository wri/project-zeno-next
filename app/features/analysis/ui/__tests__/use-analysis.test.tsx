// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisService } from "../../application/analysis-service";
import type { AnalysisSelection } from "../../domain/analysis-selection";
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
    expect(service.run).toHaveBeenCalledWith(selection);
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

  it("uses a default service when none is injected (composition root)", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAnalysis());

      act(() => {
        result.current.run(selection);
      });
      expect(result.current.status).toBe("running");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.status).toBe("done");
      expect(result.current.result?.id).toMatch(/^stub:/);
    } finally {
      vi.useRealTimers();
    }
  });
});
