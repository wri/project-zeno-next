import { format } from "date-fns";

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";
import type { AnalysisSelection } from "@/app/store/selectAnalysisSlice";
import { isFeatureEnabled } from "@/src/shared/lib/feature-flags";
import {
  DEFAULT_ANALYSIS_START_DATE,
  DEFAULT_ANALYSIS_END_DATE,
} from "@/src/features/analysis";

/**
 * Surfaces the create-dashboard nudge for an area selection. Same intentional
 * gate as the analyse / view-analysis CTAs: only when a dataset is active
 * alongside the selected area. Returns whether a nudge was surfaced.
 *
 * Three things must hold beyond that gate:
 *
 *  - the dashboards feature is on for this session. `/dashboards/*` is behind
 *    `?ff=dashboard` (DashboardFeatureGate bounces everyone else back to /app),
 *    so without this check the nudge would offer a destination the user can't
 *    reach.
 *  - the selection resolved a src id and a subtype. POST /api/dashboards
 *    requires both, so a nudge without them could only fail on click.
 *  - a dataset is active, which supplies the insight seeded into the new
 *    dashboard (PZB-1119: "populated with non-generative insights for the
 *    active dataset").
 */
export function showCreateDashboardNudge(
  selection: AnalysisSelection
): boolean {
  if (!selection.name) return false;

  // Read live rather than through useFeatureFlag: this runs outside React, and
  // nav helpers rewrite the URL across the thread redirect.
  if (
    typeof window === "undefined" ||
    !isFeatureEnabled(new URLSearchParams(window.location.search), "dashboard")
  ) {
    return false;
  }

  const { srcId, subtype } = selection;
  if (!srcId || !subtype) return false;

  // A visible dataset layer IS the active dataset. Skip context sub-layers
  // (parentLayerId set) so we match showAnalysisCta's gate.
  const datasetLayer = useMapStore
    .getState()
    .layers.find((l) => typeof l.datasetId === "number" && !l.parentLayerId);
  if (!datasetLayer) return false;

  const datasetId = datasetLayer.datasetId!;
  // Prefer the canonical catalogue name — it matches what sendMessage puts in
  // ui_context.dataset_selected — and fall back to the layer's display name.
  const datasetName =
    DATASET_BY_ID[datasetId]?.dataset_name ?? datasetLayer.name;
  if (!datasetName) return false;

  const dateRange = useChatStore.getState().dateRange;
  const startDate = dateRange
    ? format(dateRange.start, "yyyy-MM-dd")
    : DEFAULT_ANALYSIS_START_DATE;
  const endDate = dateRange
    ? format(dateRange.end, "yyyy-MM-dd")
    : DEFAULT_ANALYSIS_END_DATE;

  // Idempotent for the live nudge: the reactive trigger re-runs on every
  // context change, and an identical re-upsert would churn the card.
  //
  // The key is every input a click would act on, not just the AOI: the dataset
  // and the date window both decide which insight gets seeded into the new
  // dashboard. Leaving the window out would let a re-run short-circuit on a
  // stale payload, so changing the pinned range would silently seed the
  // analysis for the previous period.
  const pending = useChatStore
    .getState()
    .messages.find((m) => m.type === "create-dashboard-nudge");
  if (
    pending?.createDashboardSuggestion?.source === selection.source &&
    pending.createDashboardSuggestion.srcId === srcId &&
    pending.createDashboardSuggestion.datasetId === datasetId &&
    pending.createDashboardSuggestion.startDate === startDate &&
    pending.createDashboardSuggestion.endDate === endDate
  ) {
    return true;
  }

  useChatStore.getState().upsertCreateDashboardNudge({
    areaName: selection.name,
    source: selection.source,
    srcId,
    subtype,
    datasetId,
    datasetName,
    startDate,
    endDate,
  });
  return true;
}
