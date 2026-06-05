import { useCallback, useState } from "react";
import type { AnalysisService } from "../application/analysis-service";
import type { AreaSelection } from "../domain/area-selection";
import type { AnalysisResult } from "../domain/analysis-result";

export type AnalysisStatus = "idle" | "running" | "done" | "error";

export interface UseAnalysis {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: Error | null;
  run: (selection: AreaSelection) => void;
}

/**
 * Driving adapter: binds the analysis use-case to React. The service is
 * injected (composition root passes the real one; tests pass a fake).
 */
export function useAnalysis(service: AnalysisService): UseAnalysis {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(
    (selection: AreaSelection) => {
      setStatus("running");
      setError(null);
      service.run(selection).then(
        (analysisResult) => {
          setResult(analysisResult);
          setStatus("done");
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
