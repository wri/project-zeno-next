"use client";

import { Box } from "@chakra-ui/react";

import ConversationHistoryDrawer from "@/app/components/ConversationHistoryDrawer";
import PageHeader from "@/app/components/PageHeader";
import { CATALOG_COLUMN_Z_INDEX } from "@/app/explorationLayout";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import {
  DashboardDetailPage,
  DashboardFeatureGate,
} from "@/src/features/dashboards";
import { InsightsPanel } from "@/src/features/insights-history";

export default function DashboardDetailRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return (
    <DashboardFeatureGate>
      <PageHeader />
      <ConversationHistoryDrawer />
      <DashboardDetailPage />
      {/* Analyses pane overlay — opened from the chat input's "Analyses"
          button (sidebarStore). Mounted here (app layer) so the dashboards
          feature never imports the insights-history feature. Its own fixed,
          positioned box below the 40px header gives the pane's absolute
          positioning the same anchor it has on the map; z-index sits just
          under the chat overlay (1100) so the chat stays on top. */}
      <Box
        position="fixed"
        top="40px"
        bottom={0}
        left={0}
        zIndex={CATALOG_COLUMN_Z_INDEX}
        display={{ base: "none", md: "flex" }}
        flexDir="column"
        pointerEvents="none"
      >
        <InsightsPanel />
      </Box>
    </DashboardFeatureGate>
  );
}
