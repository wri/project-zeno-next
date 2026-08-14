"use client";

import ConversationHistoryDrawer from "@/app/components/ConversationHistoryDrawer";
import PageHeader from "@/app/components/PageHeader";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { DashboardsPage } from "@/src/features/dashboards";

export default function DashboardsRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <>
      <PageHeader />
      <ConversationHistoryDrawer />
      <DashboardsPage />
    </>
  );
}
