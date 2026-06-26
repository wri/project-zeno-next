"use client";

import { useRef } from "react";
import { Box, Flex } from "@chakra-ui/react";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";
import DashboardChatPanel from "@/app/dashboards/components/DashboardChatPanel";
import DashboardInsightsPanel from "@/app/dashboards/components/DashboardInsightsPanel";
import DashboardAreasPanel from "@/app/dashboards/components/DashboardAreasPanel";
import useComposerStore from "@/app/dashboards/lib/composerStore";

// The dashboards chat dock, unified with the main app's floating panel:
//
//  • Default — the chat is a floating, draggable card anchored bottom-left over
//    the (full-width) dashboard content, dragged from its header handle.
//  • Area / analysis open — when the setup flow is active (or the chat's
//    "Analyses" chip is used) the dock goes full-screen and shows the double
//    pane: the context panel (Areas before an AOI, Analyses after) beside the
//    chat. This is the full-screen state of the same floating panel.

// Release within this many px of home → spring back to the bottom-left corner.
const SNAP_THRESHOLD_PX = 120;

export default function DashboardChatDock() {
  const setupPane = useComposerStore((s) => s.setupPane);
  const analysesOpen = useComposerStore((s) => s.analysesOpen);
  const closeAnalyses = useComposerStore((s) => s.closeAnalyses);
  const closeSetupPane = useComposerStore((s) => s.closeSetupPane);

  // Both the setup flow and the "Analyses" chip open the full-screen double
  // pane; closing dismisses whichever opened it.
  const dockPane = setupPane ?? (analysesOpen ? "analyses" : null);
  const closeDock = () => {
    closeSetupPane();
    closeAnalyses();
  };

  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const constraintRef = useRef<HTMLDivElement>(null);

  // Snap home if released near the bottom-left corner; otherwise leave it where
  // the user dropped it.
  const handleDragEnd = () => {
    if (
      Math.abs(x.get()) < SNAP_THRESHOLD_PX &&
      Math.abs(y.get()) < SNAP_THRESHOLD_PX
    ) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 40 });
    }
  };

  if (dockPane) {
    return (
      <Flex position="absolute" inset={0} zIndex={30} bg="bg">
        <Box w={{ base: "full", md: "420px" }} flexShrink={0} h="100%">
          {dockPane === "areas" ? (
            <DashboardAreasPanel onClose={closeDock} />
          ) : (
            <DashboardInsightsPanel onClose={closeDock} />
          )}
        </Box>
        <Box
          flex="1 1 auto"
          minW={0}
          h="100%"
          display={{ base: "none", md: "block" }}
        >
          <DashboardChatPanel />
        </Box>
      </Flex>
    );
  }

  // Floating compact chat. The constraint layer covers the content area but is
  // click-through (pointerEvents none) so only the panel itself is interactive.
  return (
    <Box
      ref={constraintRef}
      position="absolute"
      inset={0}
      pointerEvents="none"
      zIndex={20}
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={constraintRef}
        onDragEnd={handleDragEnd}
        style={{
          x,
          y,
          position: "absolute",
          bottom: 12,
          left: 12,
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <DashboardChatPanel floating dragControls={dragControls} />
      </motion.div>
    </Box>
  );
}
