"use client";

import { Flex } from "@chakra-ui/react";

import type { AnalysisService } from "@/src/features/analysis";
import type { Dashboard } from "../api/schemas";
import DashboardAnalysisTemplates from "./DashboardAnalysisTemplates";
import DashboardSuggestedModules from "./DashboardSuggestedModules";

/**
 * The dashboard footer (Figma node 3937:3876, below the sections): the
 * analysis templates, then the suggested modules. Rendered under the widget
 * grid and inside the empty-state hero. Every card writes to the dashboard,
 * so the footer is owner-only. `service` is injectable for tests.
 */
export default function DashboardFooter({
  dashboard,
  isOwner,
  // The design's space between the two blocks; the hero's panel is tighter.
  gap = "76px",
  service,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  gap?: string;
  service?: AnalysisService;
}) {
  if (!isOwner) return null;

  return (
    <Flex direction="column" gap={gap}>
      <DashboardAnalysisTemplates dashboard={dashboard} isOwner={isOwner} />
      <DashboardSuggestedModules
        dashboard={dashboard}
        isOwner={isOwner}
        service={service}
      />
    </Flex>
  );
}
