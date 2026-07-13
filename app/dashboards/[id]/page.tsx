"use client";

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
      <DashboardDetailPage />
    </DashboardFeatureGate>
  );
}
