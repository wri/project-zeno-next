"use client";

import ConversationHistoryDrawer from "@/app/components/ConversationHistoryDrawer";
import PageHeader from "@/app/components/PageHeader";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import {
  DashboardDetailPage,
  DashboardFeatureGate,
} from "@/src/features/dashboards";

export default function DashboardDetailRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <DashboardFeatureGate>
      <PageHeader />
      <ConversationHistoryDrawer />
      <DashboardDetailPage />
    </DashboardFeatureGate>
  );
}
