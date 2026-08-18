import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisService } from "../model/analysis-service";
import type { AnalysisSelection } from "../model/analysis-selection";
import type { AnalysisResult } from "../model/analysis-result";
import { analysisService } from "./analysis-service";
import { chartsToWidgets, generateInsightTitle } from "@/src/entities/insight";
import type { InsightSink } from "../model/insight-sink";
import useInsightStore from "@/app/store/insightStore";
import useChatStore from "@/app/store/chatStore";

// ── Composition root ──────────────────────────────────────────────────────────
// Wire the real application service and the real insight sink with their driven
// adapters. Tests inject their own fakes via the hook parameters.

const defaultService: AnalysisService = analysisService;

const defaultSink: InsightSink = {
  // Guard against empty arrays so the store isn't notified with nothing to add.
  add: (widgets) => {
    if (widgets.length > 0) {
      useInsightStore.getState().addInsights(widgets);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * The dataset name to use in a chart's "{dataset} in {location}" title. Every
 * dataset uses its own name, with one exception: a tree cover loss analysis
 * also returns a GHG-emissions chart (see project-zeno `charts.py:
 * TCLChartGenerator`), identified by its y-axis, which is titled as
 * "GHG Emissions from Tree Cover Loss" instead.
 */
/** Year from a "yyyy-MM-dd" selection bound, for the YEARS parameter chip. */
function isoYear(date: string | undefined): number | undefined {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) ? year : undefined;
}

function chartDatasetName(
  widget: { yAxis?: string },
  datasetName: string
): string {
  return widget.yAxis === "carbon_emissions_MgCO2e"
    ? "GHG Emissions from Tree Cover Loss"
    : datasetName;
}

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
      // Drive the shared insight-workspace skeleton (the direct flow doesn't go
      // through chatStore, which owns this flag for the generative flow).
      useChatStore.getState().setGeneratingInsight(true);

      service.run(selection, controller.signal).then(
        (analysisResult) => {
          setResult(analysisResult);
          setStatus("done");
          // Carry the dataset and date range through as well as the area, so
          // the workspace renders the full AREA / DATA / YEARS chip row rather
          // than an area-only one.
          const rawWidgets = chartsToWidgets(
            analysisResult.charts,
            analysisResult.params
              ? {
                  areas: [analysisResult.params.name],
                  dataset: selection.dataset.name,
                  startYear: isoYear(selection.startDate),
                  endYear: isoYear(selection.endDate),
                }
              : undefined
          );
          // Give each widget a "{dataset} in {location}" title matching the
          // curated insights, when the dataset's name is known (it always is
          // for this flow's real callers — only test fixtures may omit it).
          // The name is resolved per chart, not per analysis: a TCL analysis
          // returns a loss chart AND a GHG-emissions chart, which must not
          // share one title.
          const datasetName = selection.dataset.name;
          const widgets = datasetName
            ? rawWidgets.map((widget) => ({
                ...widget,
                title: generateInsightTitle({
                  datasetName: chartDatasetName(widget, datasetName),
                  locationName: selection.area.name,
                  areaLabel: selection.area.name,
                }),
              }))
            : rawWidgets;
          // Add the chart and drop the skeleton flag together so the workspace
          // swaps skeleton → chart in one render (no empty flash).
          sink.add(widgets);
          useChatStore.getState().setGeneratingInsight(false);
        },
        (cause: unknown) => {
          useChatStore.getState().setGeneratingInsight(false);
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
