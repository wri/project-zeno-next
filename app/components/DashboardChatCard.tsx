"use client";
import { useRouter } from "next/navigation";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { InfoCard } from "./InfoCard";
import { useDashboard } from "@/src/features/dashboards/ui/dashboardQueries";

// Figma: data-visualisation/semantics/attention — the DASHBOARD label colour.
const LABEL_COLOR = "#CE8303";
// Same blue shades as the insight AnalysisCard thumbnail, for consistency.
const ICON_COLOR = "#0049AA";
const ICON_BG = "#F7F9FF";

export interface DashboardChatCardProps {
  dashboardId: string;
  /** Streamed with the dashboard_updated signal; threads recorded before the
   * backend sent it carry only the id. */
  dashboardName?: string;
}

export function DashboardChatCard({
  dashboardId,
  dashboardName,
}: DashboardChatCardProps) {
  const router = useRouter();
  // The subtitle (creation time, insight count) comes from the dashboard
  // resource; dashboard_updated invalidates the query, so the count stays
  // live while the agent keeps adding widgets. The title prefers the
  // streamed name and falls back to the fetched one for older threads.
  const { data: dashboard } = useDashboard(dashboardId);

  let description: string | undefined;
  if (dashboard) {
    const created = new Date(dashboard.created_at);
    const createdAgo = isNaN(created.getTime())
      ? null
      : formatDistanceToNow(created, { addSuffix: true });
    const insightCount = dashboard.widgets.filter(
      (widget) => widget.widget_type === "insight"
    ).length;
    description = [
      createdAgo,
      `${insightCount} insight${insightCount === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <InfoCard
      thumbnail={<SquaresFourIcon size={32} color={ICON_COLOR} />}
      thumbnailBg={ICON_BG}
      typeLabel="DASHBOARD"
      typeLabelColor={LABEL_COLOR}
      title={dashboardName ?? dashboard?.name ?? "Dashboard"}
      description={description}
      interactive
      ariaLabel="Open dashboard"
      onClick={() => router.push(`/dashboards/${dashboardId}`)}
    />
  );
}
