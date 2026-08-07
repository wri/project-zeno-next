"use client";

import { useEffect, useRef, useState } from "react";

import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import { generateInsightTitle } from "@/src/entities/insight";
// Deep imports (not the feature barrels) for the same reason as
// insights-panel.tsx: keep bundles lean and rule out feature import cycles.
import { defaultAnalysisService } from "@/src/features/analysis/ui/default-analysis-service";
import type { AnalysisService } from "@/src/features/analysis/model/analysis-service";
import {
  useAddInsightWidget,
  useDashboard,
  useDeleteWidget,
} from "@/src/features/dashboards/ui/dashboardQueries";
import type { CuratedAnalysisTemplate } from "../lib/curated-analyses";
import {
  forgetCuratedRun,
  getCuratedRun,
  rememberCuratedRun,
  type CuratedRun,
} from "../lib/curated-run-registry";
import { curatedWidgetConfig } from "../lib/curated-widget-config";

const errorToast = (title: string, description: string) =>
  toaster.create({ title, description, type: "error", duration: 4000 });

export interface CuratedAnalysis {
  /** "{dataset} in {area}" once the dashboard's AOI is known; dataset name until then. */
  title: string;
  /** True when this template's insight is on the dashboard grid. */
  shown: boolean;
  /** True when the viewer owns this dashboard and its AOI has resolved. */
  addable: boolean;
  /** True while the analysis itself is running (drives the "Generating…" label). */
  running: boolean;
  /** True while anything is in flight — analysis run or widget add/remove. */
  pending: boolean;
  /** Adds the analysis (running it first if it never ran), or removes it. */
  toggle: () => void;
}

/**
 * Drives one curated analysis template on the current dashboard, with
 * run-once-then-reuse semantics:
 *
 * - never ran here → submit `/api/analyze` for the dashboard's AOI, remember
 *   the persisted insight id, POST a widget titled "{dataset} in {area}"
 * - ran before, widget removed → POST a widget for the remembered insight
 *   (no re-run, no duplicate insight)
 * - widget on the grid → DELETE it (the insight itself is kept for reuse)
 *
 * The remembered run lives in localStorage (see curated-run-registry.ts);
 * losing it just means the next toggle runs a fresh analysis.
 */
export function useCuratedAnalysis(
  template: CuratedAnalysisTemplate,
  service: AnalysisService = defaultAnalysisService
): CuratedAnalysis {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const userId = useAuthStore((s) => s.userId);
  const { data: dashboard } = useDashboard(dashboardId);
  const addWidget = useAddInsightWidget(dashboardId);
  const deleteWidget = useDeleteWidget(dashboardId);

  // Local mirror of this (dashboard, dataset) pair's registry entry. The App
  // Router keeps the component mounted when navigating between dashboards, so
  // the mirror is re-seeded whenever the pair changes (the render-time reset
  // pattern from the React docs) — a remembered run can never leak across
  // dashboards. Server-side the registry reads as undefined, which renders
  // identically (shown/addable also need client-only query data).
  const runKey = `${dashboardId}:${template.datasetId}`;
  const [runState, setRunState] = useState(() => ({
    key: runKey,
    run: getCuratedRun(dashboardId, template.datasetId),
  }));
  if (runState.key !== runKey) {
    setRunState({
      key: runKey,
      run: getCuratedRun(dashboardId, template.datasetId),
    });
  }
  const run = runState.key === runKey ? runState.run : undefined;
  const setRun = (next: CuratedRun | undefined) =>
    setRunState({ key: runKey, run: next });

  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const area = dashboard?.aois[0];
  const isOwner = !!userId && !!dashboard && userId === dashboard.user_id;
  const addable = isOwner && !!area;

  const widget = run
    ? dashboard?.widgets.find((w) => w.insight_id === run.insightId)
    : undefined;
  const shown = !!widget;
  const pending = running || addWidget.isPending || deleteWidget.isPending;

  const title = area
    ? generateInsightTitle({
        datasetName: template.datasetName,
        locationName: area.name,
        areaLabel: area.name,
      })
    : template.datasetName;

  const forgetRun = () => {
    forgetCuratedRun(dashboardId, template.datasetId);
    setRun(undefined);
  };

  const attachInsight = ({ insightId, config }: CuratedRun) => {
    addWidget.mutate(
      { insightId, config },
      {
        onError: (error: unknown) => {
          // A 4xx means the insight itself is gone (deleted server-side, or
          // another user's) — drop the remembered run so the next toggle
          // regenerates instead of failing forever. Transient failures
          // (5xx/network) keep the mapping and just surface the toast.
          const status = (error as { status?: number }).status;
          if (status !== undefined && status >= 400 && status < 500) {
            forgetRun();
          }
          errorToast(
            "Couldn't add to dashboard",
            "The analysis wasn't added. Please try again."
          );
        },
      }
    );
  };

  const runAndAttach = () => {
    if (!area) return;
    // `pending` gates toggle per render, but two clicks can land before the
    // `running` state commits — aborting any prior controller keeps at most
    // one analysis in flight.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);

    service
      .run(
        {
          area: {
            name: area.name,
            source: area.source,
            srcId: area.src_id,
            subtype: area.subtype,
          },
          dataset: { id: template.datasetId, name: template.datasetName },
          startDate: template.startDate,
          endDate: template.endDate,
        },
        controller.signal
      )
      .then(
        (result) => {
          setRunning(false);
          if (result.charts.length === 0) {
            // The job completed but produced nothing to show (no chart
            // generator for this dataset) — don't remember or attach it.
            errorToast(
              "Couldn't generate the analysis",
              "No charts were produced. Please try again."
            );
            return;
          }
          const completedRun: CuratedRun = {
            insightId: result.id,
            config: curatedWidgetConfig(
              result.charts,
              template.datasetName,
              area.name
            ),
          };
          rememberCuratedRun(dashboardId, template.datasetId, completedRun);
          setRun(completedRun);
          attachInsight(completedRun);
        },
        (cause: unknown) => {
          setRunning(false);
          // The user navigated away or the component unmounted — not a failure.
          if (cause instanceof Error && cause.name === "AbortError") return;
          errorToast(
            "Couldn't generate the analysis",
            "The analysis didn't complete. Please try again."
          );
        }
      );
  };

  const toggle = () => {
    if (!addable || pending) return;

    if (widget) {
      deleteWidget.mutate(widget.id, {
        onError: () =>
          errorToast(
            "Couldn't remove from dashboard",
            "The analysis wasn't removed. Please try again."
          ),
      });
      return;
    }

    if (run) {
      attachInsight(run);
      return;
    }

    runAndAttach();
  };

  return { title, shown, addable, running, pending, toggle };
}
