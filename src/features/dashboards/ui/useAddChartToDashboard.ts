"use client";

import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import { isChartShown, withChartHidden, withChartShown } from "../lib/widgets";
import {
  useAddInsightWidget,
  useDashboard,
  useDeleteWidget,
  useUpdateWidget,
} from "./dashboardQueries";

export interface AddChartToDashboard {
  /** True while the viewer is on a dashboard page (add/remove semantics apply). */
  active: boolean;
  /** True when this chart can be added: an owned dashboard + real insight/chart ids. */
  addable: boolean;
  /** True when this chart is currently shown by the insight's widget. */
  shown: boolean;
  pending: boolean;
  /** Adds the chart if hidden, hides it if shown. No-op unless `addable`. */
  toggle: () => void;
}

/**
 * Adds or removes a single chart of an analysis on the current dashboard,
 * tracked in the insight widget's `config.chartIds` (the shown subset). One
 * insight still maps to one widget — this hook just edits which of its charts
 * that widget renders:
 *
 * - no widget yet → POST a widget carrying `config.chartIds: [chartId]`
 * - widget exists, chart hidden → PATCH config to add the chart
 * - widget exists, chart shown → PATCH config to drop it (hiding the last
 *   chart keeps the widget with `chartIds: []` — the summary may still show)
 *
 * Sibling of `useAddInsightToDashboard` (whole-analysis add, used by the
 * chat-side toggle); this is the per-chart control used by the Analyses pane.
 */
export function useAddChartToDashboard(
  insightId?: string,
  chartId?: string
): AddChartToDashboard {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const userId = useAuthStore((s) => s.userId);
  const { data: dashboard } = useDashboard(dashboardId);
  const addWidget = useAddInsightWidget(dashboardId);
  const updateWidget = useUpdateWidget(dashboardId);
  const deleteWidget = useDeleteWidget(dashboardId);

  const active = dashboardId.length > 0;
  const isOwner = !!userId && !!dashboard && userId === dashboard.user_id;
  const addable = active && isOwner && !!insightId && !!chartId;

  const widget = insightId
    ? dashboard?.widgets.find((w) => w.insight_id === insightId)
    : undefined;
  const allChartIds = widget?.insight?.charts
    ? [...widget.insight.charts]
        .sort((a, b) => a.position - b.position)
        .map((c) => c.id)
    : [];
  const shown =
    !!widget && !!chartId && isChartShown(widget.config, chartId, allChartIds);
  const pending =
    addWidget.isPending || updateWidget.isPending || deleteWidget.isPending;

  const errorToast = (adding: boolean) => () =>
    toaster.create({
      title: adding
        ? "Couldn't add to dashboard"
        : "Couldn't remove from dashboard",
      description: `The chart wasn't ${adding ? "added" : "removed"}. Please try again.`,
      type: "error",
      duration: 4000,
    });

  const toggle = () => {
    if (!addable || pending || !insightId || !chartId) return;

    if (!widget) {
      addWidget.mutate(
        { insightId, config: { chartIds: [chartId] } },
        { onError: errorToast(true) }
      );
      return;
    }

    if (shown) {
      updateWidget.mutate(
        {
          widgetId: widget.id,
          patch: {
            config: withChartHidden(widget.config, chartId, allChartIds),
          },
        },
        { onError: errorToast(false) }
      );
      return;
    }

    updateWidget.mutate(
      {
        widgetId: widget.id,
        patch: { config: withChartShown(widget.config, chartId, allChartIds) },
      },
      { onError: errorToast(true) }
    );
  };

  return { active, addable, shown, pending, toggle };
}
