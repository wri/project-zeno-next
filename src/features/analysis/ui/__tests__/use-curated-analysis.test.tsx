// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { Chart } from "@/src/entities/insight";

import { AnalysisJobFailedError } from "../../model/analysis-error";
import type { AnalysisResult } from "../../model/analysis-result";
import type { AnalysisSelection } from "../../model/analysis-selection";
import type { AnalysisService } from "../../model/analysis-service";
import { useCuratedAnalysis } from "../use-curated-analysis";

const selection: AnalysisSelection = {
  area: { name: "Pará", source: "gadm", srcId: "BRA.14_1", subtype: "state" },
  dataset: { id: 4, name: "Tree cover loss" },
  startDate: "2001-01-01",
  endDate: "2025-12-31",
};

const chart: Chart = {
  id: "c-1",
  position: 0,
  title: "Annual tree cover loss",
  type: "bar",
  xAxis: "year",
  yAxis: "loss_ha",
  colorField: "",
  stackField: "",
  groupField: "",
  seriesFields: [],
  data: [{ year: 2020, loss_ha: 5 }],
};

const RESULT: AnalysisResult = { id: "ins-1", charts: [chart] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function fakeService(impl: AnalysisService["run"]): AnalysisService {
  return { run: vi.fn(impl) };
}

describe("useCuratedAnalysis", () => {
  it("starts not-run and does not touch the service", () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    expect(result.current.state).toBe("not-run");
    expect(result.current.result).toBeNull();
    expect(result.current.insightId).toBeNull();
    expect(service.run).not.toHaveBeenCalled();
  });

  it("start() runs the analysis: running, then ready with the result", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    let started: Promise<AnalysisResult | null>;
    act(() => {
      started = result.current.start();
    });
    await waitFor(() => expect(result.current.state).toBe("running"));
    expect(service.run).toHaveBeenCalledWith(selection);

    await act(async () => {
      d.resolve(RESULT);
      await started;
    });

    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(result.current.insightId).toBe("ins-1");
    expect(result.current.result).toEqual(RESULT);
  });

  it("readState() reports the state imperatively, in step with the rendered state", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    expect(result.current.readState()).toBe("not-run");

    let started: Promise<AnalysisResult | null>;
    act(() => {
      started = result.current.start();
    });
    await waitFor(() => expect(result.current.state).toBe("running"));
    expect(result.current.readState()).toBe("running");

    await act(async () => {
      d.resolve(RESULT);
      await started;
    });

    // Readable straight after the awaited start, before any re-render.
    expect(result.current.readState()).toBe("ready");
    await waitFor(() => expect(result.current.state).toBe("ready"));
  });

  it("readState() distinguishes a failed job from a transport error", async () => {
    const failed = fakeService(() =>
      Promise.reject(new AnalysisJobFailedError("job-1"))
    );
    const a = renderHook(() => useCuratedAnalysis(selection, failed), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () => {
      await a.result.current.start();
    });
    expect(a.result.current.readState()).toBe("unavailable");

    const offline = fakeService(() => Promise.reject(new Error("offline")));
    const b = renderHook(() => useCuratedAnalysis(selection, offline), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () => {
      await b.result.current.start();
    });
    expect(b.result.current.readState()).toBe("error");
  });

  it("does not run again once a result is cached", async () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.state).toBe("ready"));

    let again: AnalysisResult | null = null;
    await act(async () => {
      again = await result.current.start();
    });

    expect(service.run).toHaveBeenCalledTimes(1);
    expect(again).toEqual(RESULT);
  });

  it("dedupes concurrent starts from two observers of the same selection", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    const client = makeClient();
    const a = renderHook(() => useCuratedAnalysis(selection, service), {
      wrapper: wrapperFor(client),
    });
    const b = renderHook(() => useCuratedAnalysis(selection, service), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      void a.result.current.start();
      void b.result.current.start();
    });
    await waitFor(() => expect(b.result.current.state).toBe("running"));

    await act(async () => {
      d.resolve(RESULT);
    });

    await waitFor(() => expect(a.result.current.state).toBe("ready"));
    await waitFor(() => expect(b.result.current.state).toBe("ready"));
    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it("keeps an in-flight run alive across unmount and hands the result to a remount", async () => {
    // The pane closing must not cancel the poll: the backend job continues
    // and persists an insight, so a cancelled client would re-run on reopen
    // and create a duplicate row.
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    const client = makeClient();
    const first = renderHook(() => useCuratedAnalysis(selection, service), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      void first.result.current.start();
    });
    await waitFor(() => expect(first.result.current.state).toBe("running"));
    first.unmount();

    await act(async () => {
      d.resolve(RESULT);
    });

    const second = renderHook(() => useCuratedAnalysis(selection, service), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(second.result.current.state).toBe("ready"));
    expect(second.result.current.insightId).toBe("ins-1");
    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it("maps a failed job to unavailable", async () => {
    const service = fakeService(() =>
      Promise.reject(new AnalysisJobFailedError("job-1"))
    );
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    let outcome: AnalysisResult | null = RESULT;
    await act(async () => {
      outcome = await result.current.start();
    });

    await waitFor(() => expect(result.current.state).toBe("unavailable"));
    expect(outcome).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("maps a completed job with no charts to no-data", async () => {
    const service = fakeService(() =>
      Promise.resolve({ id: "ins-empty", charts: [] })
    );
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.state).toBe("no-data"));
    expect(result.current.insightId).toBe("ins-empty");
  });

  it("maps any other failure to error", async () => {
    const service = fakeService(() => Promise.reject(new Error("offline")));
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.state).toBe("error"));
  });

  it("retry() after an error runs the analysis again", async () => {
    const service = fakeService(
      vi
        .fn<AnalysisService["run"]>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(RESULT)
    );
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.state).toBe("error"));

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(service.run).toHaveBeenCalledTimes(2);
  });

  it("retry() after no-data forces a fresh run despite the cached result", async () => {
    const service = fakeService(
      vi
        .fn<AnalysisService["run"]>()
        .mockResolvedValueOnce({ id: "ins-empty", charts: [] })
        .mockResolvedValueOnce(RESULT)
    );
    const { result } = renderHook(
      () => useCuratedAnalysis(selection, service),
      { wrapper: wrapperFor(makeClient()) }
    );

    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.state).toBe("no-data"));

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(service.run).toHaveBeenCalledTimes(2);
  });

  it("caches per dataset: a different dataset runs separately", async () => {
    const service = fakeService((sel) =>
      Promise.resolve({ id: `ins-${sel.dataset.id}`, charts: [chart] })
    );
    const client = makeClient();
    const tcl = renderHook(() => useCuratedAnalysis(selection, service), {
      wrapper: wrapperFor(client),
    });
    const gain = renderHook(
      () =>
        useCuratedAnalysis(
          { ...selection, dataset: { id: 5, name: "Tree cover gain" } },
          service
        ),
      { wrapper: wrapperFor(client) }
    );

    await act(async () => {
      await tcl.result.current.start();
      await gain.result.current.start();
    });

    await waitFor(() => expect(tcl.result.current.insightId).toBe("ins-4"));
    await waitFor(() => expect(gain.result.current.insightId).toBe("ins-5"));
    expect(service.run).toHaveBeenCalledTimes(2);
  });
});
