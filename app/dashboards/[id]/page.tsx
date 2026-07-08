"use client";

import PageHeader from "@/app/components/PageHeader";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { DashboardDetailPage } from "@/src/features/dashboards";

export default function DashboardDetailRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <>
      <PageHeader />
      <DashboardDetailPage />
    </>
  );
}
