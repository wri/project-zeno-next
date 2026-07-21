"use client";
import { useRouter } from "next/navigation";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { InfoCard } from "./InfoCard";
import { useDashboard } from "@/src/features/dashboards/ui/dashboardQueries";

const DASHBOARD_LABEL_COLOR = "#7B61FF";

export interface DashboardChatCardProps {
  dashboardId: string;
  /** Streamed with the dashboard_updated signal; threads recorded before the
   * backend sent it carry only the id. */
  dashboardName?: string;
}

function CardShell({
  dashboardId,
  title,
}: {
  dashboardId: string;
  title: string;
}) {
  const router = useRouter();
  return (
    <InfoCard
      thumbnail={<SquaresFourIcon size={32} color="#656E7B" />}
      thumbnailBg="gray.100"
      typeLabel="DASHBOARD"
      typeLabelColor={DASHBOARD_LABEL_COLOR}
      title={title}
      description="Open dashboard"
      onClick={() => router.push(`/dashboards/${dashboardId}?ff=dashboard`)}
    />
  );
}

// Fallback for threads that predate the streamed dashboard_name: resolve the
// title from the dashboards API instead of showing a nameless card.
function FetchedTitleCard({ dashboardId }: { dashboardId: string }) {
  const { data } = useDashboard(dashboardId);
  return (
    <CardShell dashboardId={dashboardId} title={data?.name ?? "Dashboard"} />
  );
}

export function DashboardChatCard({
  dashboardId,
  dashboardName,
}: DashboardChatCardProps) {
  if (dashboardName) {
    return <CardShell dashboardId={dashboardId} title={dashboardName} />;
  }
  return <FetchedTitleCard dashboardId={dashboardId} />;
}
