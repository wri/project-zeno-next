"use client";

import PageHeader from "@/app/components/PageHeader";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import {
  DashboardFeatureGate,
  DashboardsPage,
} from "@/src/features/dashboards";

export default function DashboardsRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <DashboardFeatureGate>
      <PageHeader />
      <DashboardsPage />
    </DashboardFeatureGate>
  );
}
