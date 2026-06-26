"use client";

import DashboardAreasPanel from "@/app/dashboards/components/DashboardAreasPanel";
import DashboardInsightsPanel from "@/app/dashboards/components/DashboardInsightsPanel";
import DashboardCataloguePanel from "@/app/dashboards/components/DashboardCataloguePanel";
import useComposerStore from "@/app/dashboards/lib/composerStore";

// Resolves the active docked side panel (Areas / Analysis / Data Catalogue).
// Returns null when none is open. Independent of the AI chat.
export default function DashboardSidePanel() {
  const sidePane = useComposerStore((s) => s.sidePane);
  const close = useComposerStore((s) => s.closeSidePane);

  if (sidePane === "areas") return <DashboardAreasPanel onClose={close} />;
  if (sidePane === "analysis")
    return <DashboardInsightsPanel onClose={close} />;
  if (sidePane === "catalogue")
    return <DashboardCataloguePanel onClose={close} />;
  return null;
}
