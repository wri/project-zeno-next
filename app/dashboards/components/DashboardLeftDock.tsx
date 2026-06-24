"use client";

import { Box } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardChatPanel from "@/app/dashboards/components/DashboardChatPanel";
import DashboardInsightsPanel from "@/app/dashboards/components/DashboardInsightsPanel";
import useComposerStore from "@/app/dashboards/lib/composerStore";

// The left dock holds the chat panel by default; opening "Analyses" slides the
// insights list in from the left edge, covering (replacing) the chat. Open/close
// is driven by the shared store so the chat input, the detail page's empty
// block, and the panel's own close button can all control it.
export default function DashboardLeftDock() {
  const analysesOpen = useComposerStore((s) => s.analysesOpen);
  const closeAnalyses = useComposerStore((s) => s.closeAnalyses);

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
