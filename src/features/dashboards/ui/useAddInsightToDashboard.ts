"use client";

import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import {
  useAddInsightWidget,
  useDashboard,
  useDeleteWidget,
} from "./dashboardQueries";

export interface AddInsightToDashboard {
  /** True while the viewer is on a dashboard page (add/remove semantics apply). */
  active: boolean;
  /**
   * True when this insight can actually be added: a dashboard the viewer owns,
   * with a real persisted insight id. False for other people's dashboards and
   * for insights that have no backend id (verified fixtures, unsaved in-session
   * analyses).
   */
  addable: boolean;
  /** True when the insight is already a widget on the current dashboard. */
  added: boolean;
  pending: boolean;
  /** Adds the insight if absent, removes it if present. No-op unless `addable`. */
  toggle: () => void;
}

/**
 * Shared "add this analysis to the current dashboard" behaviour, driven by the
 * ambient view context (no chat round trip — a plain REST widget add/remove
 * with the analysis's persisted insight id). Backs both the chat-side
 * `AddToDashboardToggle` and the Analyses pane's per-card add control. All
 * charts of one analysis share the insight, so one toggle adds/removes the
 * whole analysis.
 */
export function useAddInsightToDashboard(
  insightId?: string
): AddInsightToDashboard {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const userId = useAuthStore((s) => s.userId);
  // Disabled (and dataless) when dashboardId is "" — off dashboard surfaces the
  // hook never fetches.
  const { data: dashboard } = useDashboard(dashboardId);
  const addWidget = useAddInsightWidget(dashboardId);
  const deleteWidget = useDeleteWidget(dashboardId);

  const active = dashboardId.length > 0;
  const isOwner = !!userId && !!dashboard && userId === dashboard.user_id;
  const addable = active && isOwner && !!insightId;
  const existing = insightId
    ? dashboard?.widgets.find((w) => w.insight_id === insightId)
    : undefined;
  const pending = addWidget.isPending || deleteWidget.isPending;

  const toggle = () => {
    if (!addable || pending || !insightId) return;
    if (existing) {
      deleteWidget.mutate(existing.id, {
        onError: () =>
          toaster.create({
            title: "Couldn't remove from dashboard",
            description: "The widget wasn't removed. Please try again.",
            type: "error",
            duration: 4000,
          }),
      });
    } else {
      addWidget.mutate(insightId, {
        onError: () =>
          toaster.create({
            title: "Couldn't add to dashboard",
            description: "The analysis wasn't added. Please try again.",
            type: "error",
            duration: 4000,
          }),
      });
    }
  };

  return { active, addable, added: !!existing, pending, toggle };
}
