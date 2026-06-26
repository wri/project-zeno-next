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

// The dashboards chat dock — a floating, draggable card anchored bottom-left
// over the (full-width) dashboard content, unified with the main app's floating
// panel.
//
//  • Default — just the chat card.
//  • Maximised — a wider floating card with the double pane: chat on the LEFT,
//    the context panel (Areas before an AOI, Analyses after) on the RIGHT.
//    Opening Areas/Analyses doesn't force this; it's the maximise toggle (or
//    clicking an Areas/Analyses chip) that opens the double pane. It is a
//    larger floating card, NOT a full-screen takeover.

// Release within this many px of home → spring back to the bottom-left corner.
const SNAP_THRESHOLD_PX = 120;

export default function DashboardChatDock() {
  const setupPane = useComposerStore((s) => s.setupPane);
  const maximised = useComposerStore((s) => s.chatMaximised);
  const setChatMaximised = useComposerStore((s) => s.setChatMaximised);

  // When maximised, the right pane follows the active context, defaulting to
  // Analyses when nothing specific is open.
  const contextPane = maximised ? (setupPane ?? "analyses") : null;
  // The context pane's close (X) collapses the double pane back to floating.
  const collapse = () => setChatMaximised(false);

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

  // The constraint layer covers the content area but is click-through
  // (pointerEvents none) so only the panel itself is interactive.
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
        <Flex
          gap={2}
          align="stretch"
          h={{ base: "70dvh", md: "560px" }}
          maxH="calc(100dvh - 96px)"
        >
          {/* Chat — always present, on the left when maximised. */}
          <DashboardChatPanel floating dragControls={dragControls} />

          {/* Context pane — only when maximised (double pane), on the right. */}
          {contextPane && (
            <Box
              w={{ base: "full", md: "400px" }}
              flexShrink={0}
              display={{ base: "none", md: "block" }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.emphasized"
              boxShadow="xl"
              overflow="hidden"
              bg="bg"
            >
              {contextPane === "areas" ? (
                <DashboardAreasPanel onClose={collapse} />
              ) : (
                <DashboardInsightsPanel onClose={collapse} />
              )}
            </Box>
          )}
        </Flex>
      </motion.div>
    </Box>
  );
}
