"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { isFeatureEnabled } from "@/src/shared/lib/feature-flags";

export default function DashboardFeatureGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  // null = not checked yet. The check must run post-commit: during a
  // client-side navigation the first render still sees the *previous* URL
  // (Next updates window.location on commit), so a render-time read closes
  // the gate even when the destination URL carries ?ff=dashboard.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setEnabled(
      isFeatureEnabled(new URLSearchParams(window.location.search), "dashboard")
    );
  }, []);

  useEffect(() => {
    if (enabled === false) router.replace("/app");
  }, [enabled, router]);

  if (!enabled) return null;

  return children;
}
