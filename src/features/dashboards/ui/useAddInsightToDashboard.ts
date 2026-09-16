"use client";

import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import { hasWidgetCustomization } from "../lib/widgets";
import {
  useAddInsightWidget,
  useDashboard,
  useDeleteWidget,
} from "./dashboardQueries";

export interface AddInsightToDashboard {
  /** True while the viewer is on a dashboard page (add/remove semantics apply). */
  active: boolean;
  /**
   * True when the viewer may add insights here at all: a dashboard they own.
   * Independent of any particular insight, so a control can be enabled before
   * the insight it will add exists (a curated card that runs, then adds).
   */
  canAdd: boolean;
  /**
   * True when this insight can actually be added: `canAdd` plus a real
   * persisted insight id. False for insights that have no backend id yet
   * (unsaved in-session analyses).
   */
  addable: boolean;
  /** True when the insight is already a widget on the current dashboard. */
  added: boolean;
  /**
   * True when removing would discard config the owner arranged by hand (chart
   * sizes, renames, hidden charts, summary toggle). Callers confirm first —
   * `toggle` itself never asks, and none of it survives a re-add.
   */
  removeNeedsConfirm: boolean;
  pending: boolean;
  /** Adds the insight if absent, removes it if present. No-op unless `addable`. */
  toggle: () => void;
  /**
   * Adds an explicit insight id, for callers that only learn the id after an
   * asynchronous step (run an analysis, then add its result). No-op unless
   * `canAdd`. A 409 from the backend means the insight is already on the
   * dashboard and is treated as success; the detail refetch then reflects it.
   */
  add: (insightId: string) => Promise<void>;
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
  const canAdd = active && isOwner;
  const addable = canAdd && !!insightId;
  const existing = insightId
    ? dashboard?.widgets.find((w) => w.insight_id === insightId)
    : undefined;
  const pending = addWidget.isPending || deleteWidget.isPending;

  const add = async (id: string) => {
    if (!canAdd || pending) return;
    try {
      await addWidget.mutateAsync({ insightId: id });
    } catch (err) {
      // 409: the insight is already a widget here (added from another tab, or
      // a race). That is the state the caller wanted, so stay quiet; the
      // mutation's onSettled has already queued the detail refetch that will
      // flip `added`.
      if ((err as { status?: number }).status === 409) return;
      toaster.create({
        title: "Couldn't add to dashboard",
        description: "The analysis wasn't added. Please try again.",
        type: "error",
        duration: 4000,
      });
    }
  };

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
      void add(insightId);
    }
  };

  return {
    active,
    canAdd,
    addable,
    added: !!existing,
    removeNeedsConfirm: !!existing && hasWidgetCustomization(existing.config),
    pending,
    toggle,
    add,
  };
}
