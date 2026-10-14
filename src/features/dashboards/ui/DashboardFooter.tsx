import { Flex } from "@chakra-ui/react";

import type { Dashboard } from "../api/schemas";
import DashboardAnalysisTemplates from "./DashboardAnalysisTemplates";
import DashboardSuggestedModules from "./DashboardSuggestedModules";

/**
 * The dashboard footer (Figma node 3937:3876, below the sections): the
 * analysis templates, then the suggested modules. Rendered under the widget
 * grid and inside the empty-state hero. Every card writes to the dashboard,
 * so callers render it for the owner only.
 */
export default function DashboardFooter({
  dashboard,
  // The design's space between the two blocks; the hero's panel is tighter.
  gap = "76px",
}: {
  dashboard: Dashboard;
  gap?: string;
}) {
  return (
    <Flex direction="column" gap={gap}>
      <DashboardAnalysisTemplates dashboard={dashboard} />
      <DashboardSuggestedModules dashboard={dashboard} />
    </Flex>
  );
}
