import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisService } from "../application/analysis-service";
import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";
import { LROAnalysisService } from "../application/lro-analysis-service";
import { RestAnalysisGateway } from "../adapters/rest-analysis-gateway";
import { SystemClock } from "../adapters/system-clock";
import { analysisResultToWidgets } from "./analysis-result-to-widgets";
import useInsightStore from "@/app/store/insightStore";

// Composition root: wire the real application service with its driven adapters.
// Tests inject their own fake via the service parameter.
const defaultService: AnalysisService = new LROAnalysisService(
  new RestAnalysisGateway(),
  new SystemClock()
);

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
 * Driving adapter: binds the analysis use-case to React. The service is
 * injected (composition root passes the real one; tests pass a fake).
 *
 * Cancellation: each call to `run` creates a fresh `AbortController`. The
 * previous controller (if any) is aborted before the new one is wired up,
 * preventing concurrent analyses. `cancel()` aborts the current controller
 * and resets state to idle. The controller is also aborted on unmount.
 */
export function useAnalysis(
  service: AnalysisService = defaultService
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
          // TODO(arch): this hook should not know about insightStore directly.
          // The correct design is an InsightSink output port injected at the
          // composition root, with ZustandInsightSink as the adapter. Deferred
          // because the rest of the app uses imperative .getState() calls in the
          // same pattern — introducing a port here in isolation would be
          // inconsistent. Revisit when the composition root is wired properly.
          const widgets = analysisResultToWidgets(analysisResult);
          if (widgets.length > 0) {
            useInsightStore.getState().addInsights(widgets);
          }
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
    [service]
  );

  return { status, result, error, run, cancel };
}
