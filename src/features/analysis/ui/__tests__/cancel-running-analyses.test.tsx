// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import useChatStore from "@/app/store/chatStore";

import type { AnalysisResult } from "../../model/analysis-result";
import type { AnalysisSelection } from "../../model/analysis-selection";
import type { AnalysisService } from "../../model/analysis-service";
import type { InsightSink } from "../../model/insight-sink";
import { cancelRunningAnalyses, useAnalysis } from "../use-analysis";

const selection: AnalysisSelection = {
  area: { name: "Kenya", source: "gadm", srcId: "KEN", subtype: "country" },
  dataset: { id: 4, name: "Tree cover loss" },
  startDate: "2015-01-01",
  endDate: "2024-12-31",
};

/** Settles only when aborted, like the real service mid-poll. */
const pendingService = (): AnalysisService => ({
  run: vi.fn(
    (_selection, signal?: AbortSignal) =>
      new Promise<AnalysisResult>((_, reject) => {
        signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      })
  ),
});

describe("cancelRunningAnalyses", () => {
  it("stops every run in flight, so no chart lands afterwards", async () => {
    const sink: InsightSink = { add: vi.fn() };
    const first = renderHook(() => useAnalysis(pendingService(), sink));
    const second = renderHook(() => useAnalysis(pendingService(), sink));
    act(() => {
      first.result.current.run(selection);
      second.result.current.run(selection);
    });
    expect(useChatStore.getState().isGeneratingInsight).toBe(true);

    act(() => cancelRunningAnalyses());

    await waitFor(() => expect(first.result.current.status).toBe("idle"));
    await waitFor(() => expect(second.result.current.status).toBe("idle"));
    expect(sink.add).not.toHaveBeenCalled();
    expect(useChatStore.getState().isGeneratingInsight).toBe(false);
  });

  it("leaves finished runs alone and later runs unaffected", async () => {
    const service: AnalysisService = {
      run: vi.fn().mockResolvedValue({ id: "r1", charts: [] }),
    };
    const sink: InsightSink = { add: vi.fn() };
    const { result } = renderHook(() => useAnalysis(service, sink));
    act(() => result.current.run(selection));
    await waitFor(() => expect(result.current.status).toBe("done"));

    act(() => cancelRunningAnalyses());
    expect(result.current.status).toBe("done");

    act(() => result.current.run(selection));
    await waitFor(() => expect(sink.add).toHaveBeenCalledTimes(2));
  });

  it("is a no-op when nothing is running", () => {
    expect(() => cancelRunningAnalyses()).not.toThrow();
  });
});
