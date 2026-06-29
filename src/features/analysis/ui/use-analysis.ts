import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisService } from "../model/analysis-service";
import type { AnalysisSelection } from "../model/analysis-selection";
import type { AnalysisResult } from "../model/analysis-result";
import { LROAnalysisService } from "../model/lro-analysis-service";
import { RestAnalysisGateway } from "../api/rest-analysis-gateway";
import { SystemClock } from "../lib/system-clock";
import { analysisResultToWidgets } from "../lib/analysis-result-to-widgets";
import type { InsightSink } from "../model/insight-sink";
import useInsightStore from "@/app/store/insightStore";

// ── Composition root ──────────────────────────────────────────────────────────
// Wire the real application service and the real insight sink with their driven
// adapters. Tests inject their own fakes via the hook parameters.

const defaultService: AnalysisService = new LROAnalysisService(
  new RestAnalysisGateway(),
  new SystemClock()
);

const defaultSink: InsightSink = {
  // Guard against empty arrays so the store isn't notified with nothing to add.
  add: (widgets) => {
    if (widgets.length > 0) {
      useInsightStore.getState().addInsights(widgets);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisStatus = "idle" | "running" | "done" | "error";

export interface UseAnalysis {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: Error | null;
  run: (selection: AnalysisSelection) => void;
  /** Aborts an in-flight analysis and resets status to "idle". No-op when idle. */
  cancel: () => void;
}

/**
 * Driving adapter: binds the analysis use-case to React. Both dependencies are
 * injected (composition root passes the real ones; tests pass fakes).
 *
 * Cancellation: each call to `run` creates a fresh `AbortController`. The
 * previous controller (if any) is aborted before the new one is wired up,
 * preventing concurrent analyses. `cancel()` aborts the current controller
 * and resets state to idle. The controller is also aborted on unmount.
 */
export function useAnalysis(
  service: AnalysisService = defaultService,
  sink: InsightSink = defaultSink
): UseAnalysis {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight analysis when the component unmounts.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(
    (selection: AnalysisSelection) => {
      // Abort any previous in-flight analysis before starting a new one.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setStatus("running");
      setResult(null);
      setError(null);

      service.run(selection, controller.signal).then(
        (analysisResult) => {
          setResult(analysisResult);
          setStatus("done");
          const widgets = analysisResultToWidgets(analysisResult);
          sink.add(widgets);
        },
        (cause: unknown) => {
          // An AbortError means the user cancelled or the component unmounted —
          // not a failure. Silently return to idle so the UI stays clean.
          if (cause instanceof Error && cause.name === "AbortError") {
            setStatus("idle");
            return;
          }
          setError(cause instanceof Error ? cause : new Error(String(cause)));
          setStatus("error");
        }
      );
    },
    [service, sink]
  );

  return { status, result, error, run, cancel };
}
