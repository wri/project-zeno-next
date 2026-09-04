"use client";

import { useMemo } from "react";

import { generateInsightTitle } from "@/src/entities/insight";
import {
  DEFAULT_ANALYSIS_END_DATE,
  DEFAULT_ANALYSIS_START_DATE,
  useCuratedAnalysis,
  type AnalysisResult,
  type AnalysisSelection,
  type AnalysisService,
  type CuratedAnalysisSpec,
  type CuratedAnalysisState,
} from "@/src/features/analysis";

import { useAddInsightToDashboard } from "./useAddInsightToDashboard";
import { useCuratedInsightOnDashboard } from "./useCuratedInsightOnDashboard";
import type { CurrentDashboardArea } from "./useCurrentDashboardArea";
import { usePendingInsightWidget } from "./usePendingInsightWidget";

/**
 * The analysis one curated entry runs for a dashboard: its single AOI, the
 * entry's dataset and the shared default window (every entry point that runs
 * an analysis without an explicit window uses the same period, so two
 * surfaces never show different numbers for one area). Memoised on its
 * primitives so the query key, and with it the session cache, is stable.
 */
export function useCuratedSelection(
  spec: CuratedAnalysisSpec,
  area: CurrentDashboardArea
): AnalysisSelection {
  const { aoiSource, aoiId, subtype, name } = area;
  const { datasetId, datasetName } = spec;
  return useMemo(
    () => ({
      area: { name, source: aoiSource, srcId: aoiId, subtype },
      dataset: { id: datasetId, name: datasetName },
      startDate: DEFAULT_ANALYSIS_START_DATE,
      endDate: DEFAULT_ANALYSIS_END_DATE,
    }),
    [aoiSource, aoiId, subtype, name, datasetId, datasetName]
  );
}

/** The curated module title, "{Dataset} in {Area}". */
export function curatedAnalysisTitle(
  spec: CuratedAnalysisSpec,
  area: CurrentDashboardArea
): string {
  return generateInsightTitle({
    datasetName: spec.datasetName,
    locationName: area.name,
    areaLabel: area.name,
  });
}

/**
 * How an `addNow` ended. `not-allowed` covers every early return: not the
 * owner, already added, the add already locked, no data known for the area,
 * or an add already pending for this entry.
 */
export type AddCuratedAnalysisOutcome =
  | "added"
  | "cancelled"
  | "unavailable"
  | "no-data"
  | "error"
  | "not-allowed";

export interface AddCuratedAnalysisToDashboard {
  title: string;
  /** The run's lifecycle (see `CuratedAnalysisState`). */
  state: CuratedAnalysisState;
  /** The completed analysis, once the run has one; charts may be empty. */
  result: AnalysisResult | null;
  /** True when a widget for this curated analysis is on the dashboard. */
  added: boolean;
  /** True when the viewer may add here at all (a dashboard they own). */
  canAdd: boolean;
  /**
   * True while a run-then-add is in progress for this entry: the dashboard
   * grid shows its loading module. Store-backed, so it survives a remount.
   */
  pending: boolean;
  /** Running, pending, or the add itself settling — the "Running..." look. */
  busy: boolean;
  /**
   * True during the add's own POST + refetch window, which cannot be
   * cancelled; controls lock for that short spell. A run in progress can
   * still be joined (`addNow`) or abandoned (`cancel`).
   */
  addLocked: boolean;
  /** Removing would discard hand-arranged module config; callers confirm first. */
  removeNeedsConfirm: boolean;
  /**
   * One gesture: register the loading module, run the analysis (or reuse /
   * retry it), then add the persisted insight. Resolves with how it ended,
   * once the add has settled or the flow stopped short. Never throws.
   */
  addNow: () => Promise<AddCuratedAnalysisOutcome>;
  /** Abandon a pending run-then-add: drops the loading module, adds nothing. */
  cancel: () => void;
  /** Removes the widget when `added`. Does not confirm; see `removeNeedsConfirm`. */
  remove: () => void;
  start: () => Promise<AnalysisResult | null>;
  retry: () => Promise<AnalysisResult | null>;
}

/**
 * The single implementation of "put this curated analysis on this dashboard":
 * run (session-cached) → attach the insight id → add the widget, with the
 * pending-module bookkeeping the grid renders from, plus cancel and remove.
 * Consumed by the Analyses pane's Curated cards and the dashboard's suggested
 * module tiles, so the two surfaces cannot drift. `service` is injectable for
 * tests.
 */
export function useAddCuratedAnalysisToDashboard(
  spec: CuratedAnalysisSpec,
  area: CurrentDashboardArea,
  service?: AnalysisService
): AddCuratedAnalysisToDashboard {
  const selection = useCuratedSelection(spec, area);
  const analysis = useCuratedAnalysis(selection, service);
  // A curated analysis of this dataset may already sit on the dashboard from
  // an earlier session; its insight id lets the entry read as added (and be
  // removed) without running anything.
  const onDashboardInsightId = useCuratedInsightOnDashboard(spec.datasetId);
  const insight = useAddInsightToDashboard(
    analysis.insightId ?? onDashboardInsightId
  );
  const pendingWidget = usePendingInsightWidget(spec.datasetId);

  const title = curatedAnalysisTitle(spec, area);
  const { state } = analysis;
  const pending = pendingWidget.isPending;
  const busy = state === "running" || pending || insight.pending;

  const addNow = async (): Promise<AddCuratedAnalysisOutcome> => {
    if (
      insight.added ||
      !insight.canAdd ||
      insight.pending ||
      state === "no-data" ||
      pendingWidget.isPendingNow()
    ) {
      return "not-allowed";
    }
    pendingWidget.begin({
      title,
      datasetName: spec.datasetName,
      chartCountHint: spec.chartCountHint,
    });
    try {
      // A failed or errored analysis is re-run; anything else starts, or
      // joins the in-flight run / reuses the cached result.
      const result =
        state === "unavailable" || state === "error"
          ? await analysis.retry()
          : await analysis.start();
      // Cancelled meanwhile: the entry is gone, so nothing is added.
      if (!pendingWidget.isPendingNow()) return "cancelled";
      if (result && result.charts.length > 0) {
        pendingWidget.attachInsightId(result.id);
        await insight.add(result.id);
        return "added";
      }
      // The run ended without charts: read how, since this closure's `state`
      // predates the run.
      const ended = analysis.readState();
      return ended === "unavailable" || ended === "no-data" ? ended : "error";
    } finally {
      // Whatever happened (added, unavailable, no data, error, cancelled),
      // release the module so nothing sticks in "Running".
      pendingWidget.clear();
    }
  };

  const remove = () => {
    if (insight.added) insight.toggle();
  };

  return {
    title,
    state,
    result: analysis.result,
    added: insight.added,
    canAdd: insight.canAdd,
    pending,
    busy,
    addLocked: insight.pending,
    removeNeedsConfirm: insight.removeNeedsConfirm,
    addNow,
    cancel: pendingWidget.clear,
    remove,
    start: analysis.start,
    retry: analysis.retry,
  };
}
