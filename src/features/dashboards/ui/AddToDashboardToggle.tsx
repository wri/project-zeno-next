"use client";

import { Button } from "@chakra-ui/react";
import { CheckIcon, SquaresFourIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import {
  useAddInsightWidget,
  useDashboard,
  useDeleteWidget,
} from "./dashboardQueries";

/**
 * Chat-side "Add to dashboard" toggle (per the MVP handoff: a plain REST
 * widget add/remove with the analysis's persisted insight id — no chat round
 * trip). The target dashboard comes from the ambient view context, so the
 * toggle renders only while the user is on a dashboard page they own; on
 * other surfaces it renders nothing. Toggle state derives from the dashboard
 * detail cache — all charts of one analysis share the insight, so one toggle
 * adds/removes the whole analysis.
 */
export default function AddToDashboardToggle({
  insightId,
}: {
  insightId: string;
}) {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const userId = useAuthStore((s) => s.userId);
  // Disabled (and dataless) when dashboardId is "" — off dashboard surfaces
  // the hook never fetches and the component renders nothing.
  const { data: dashboard } = useDashboard(dashboardId);
  const addWidget = useAddInsightWidget(dashboardId);
  const deleteWidget = useDeleteWidget(dashboardId);

  if (!dashboard || !userId || userId !== dashboard.user_id) return null;

  const existing = dashboard.widgets.find((w) => w.insight_id === insightId);
  const pending = addWidget.isPending || deleteWidget.isPending;

  const onToggle = () => {
    if (pending) return;
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

  return (
    <Button
      size="xs"
      variant={existing ? "solid" : "outline"}
      colorPalette={existing ? "primary" : undefined}
      onClick={onToggle}
      h={6}
      rounded="sm"
      color={existing ? undefined : "neutral.500"}
      loading={pending}
      aria-pressed={!!existing}
      title={
        existing
          ? "Remove this analysis from the dashboard"
          : "Add this analysis to the dashboard"
      }
    >
      {existing ? <CheckIcon size={12} /> : <SquaresFourIcon size={12} />}
      {existing ? "On dashboard" : "Add to dashboard"}
    </Button>
  );
}
