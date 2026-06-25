"use client";

import { Box, Flex } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardChatPanel from "@/app/dashboards/components/DashboardChatPanel";
import DashboardInsightsPanel from "@/app/dashboards/components/DashboardInsightsPanel";
import DashboardAreasPanel from "@/app/dashboards/components/DashboardAreasPanel";
import useComposerStore from "@/app/dashboards/lib/composerStore";

// The left dock normally holds just the chat panel; opening "Analyses" slides
// the insights list in from the left edge, covering the chat.
//
// During the new-dashboard "setup" flow the dock goes double-paned instead: a
// context pane (Areas before an AOI is picked, Analyses after) is docked to the
// LEFT of the chat — matching the design's "Areas or Analysis panel (left) next
// to the AI input panel (right)". Driven by `setupPane` in the shared store so
// the detail page, the panels' close buttons, and the chat chips all agree.
export default function DashboardLeftDock() {
  const analysesOpen = useComposerStore((s) => s.analysesOpen);
  const closeAnalyses = useComposerStore((s) => s.closeAnalyses);
  const setupPane = useComposerStore((s) => s.setupPane);
  const closeSetupPane = useComposerStore((s) => s.closeSetupPane);

  // Setup mode: two panes side by side. The slide-over Analyses is suppressed
  // here so we never show two analyses panels at once.
  if (setupPane) {
    return (
      <Flex h="100%" flexShrink={0}>
        <Box
          h="100%"
          w={{ base: "full", md: "400px" }}
          flexShrink={0}
          overflow="hidden"
        >
          {setupPane === "areas" ? (
            <DashboardAreasPanel onClose={closeSetupPane} />
          ) : (
            <DashboardInsightsPanel onClose={closeSetupPane} />
          )}
        </Box>
        <DashboardChatPanel />
      </Flex>
    );
  }

  return (
    <Box
      position="relative"
      h="100%"
      w={{ base: "full", md: "400px" }}
      flexShrink={0}
      overflow="hidden"
    >
      <DashboardChatPanel />

      <AnimatePresence>
        {analysesOpen && (
          <motion.div
            key="analyses"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, zIndex: 2 }}
          >
            <DashboardInsightsPanel onClose={closeAnalyses} />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
