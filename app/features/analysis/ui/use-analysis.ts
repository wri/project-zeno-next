import { useCallback, useState } from "react";
import type { AnalysisService } from "../application/analysis-service";
import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";
import { StubAnalysisService } from "../adapters/stub-analysis-service";
import { analysisResultToWidgets } from "./analysis-result-to-widgets";
import useInsightStore from "@/app/store/insightStore";

// Composition root: the default wiring. Swapped for the real REST-backed
// service later; tests inject their own fake.
const defaultService: AnalysisService = new StubAnalysisService();

export type AnalysisStatus = "idle" | "running" | "done" | "error";

export interface UseAnalysis {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: Error | null;
  run: (selection: AnalysisSelection) => void;
}

/**
 * Driving adapter: binds the analysis use-case to React. The service is
 * injected (composition root passes the real one; tests pass a fake).
 */
export function useAnalysis(
  service: AnalysisService = defaultService
): UseAnalysis {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(
    (selection: AnalysisSelection) => {
      setStatus("running");
      setError(null);
      service.run(selection).then(
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
          setError(cause instanceof Error ? cause : new Error(String(cause)));
          setStatus("error");
        }
      );
    },
    [service]
  );

  return { status, result, error, run };
}
