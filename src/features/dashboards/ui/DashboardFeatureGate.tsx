"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

export default function DashboardFeatureGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const enabled = useFeatureFlag("dashboard");

  useEffect(() => {
    if (!enabled) router.replace("/app");
  }, [enabled, router]);

  if (!enabled) return null;

  return children;
}
