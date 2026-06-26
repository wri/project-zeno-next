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
import DashboardSidePanel from "@/app/dashboards/components/DashboardSidePanel";
import useComposerStore from "@/app/dashboards/lib/composerStore";

// The dashboards workspace. Two INDEPENDENT things live over the content:
//
//  • Side panel (Areas / Analysis / Data Catalogue) — a full-height docked
//    column, opened/closed on its own.
//  • AI chat — either a floating, draggable card (default) or, when full-sized,
//    a full-height column docked to the LEFT of the side panel.
//
// Docked columns are in-flow (they shrink the content beside them); the floating
// chat is an absolute overlay.

const PANEL_WIDTH = 400;
// Release within this many px of home → spring back to the bottom-left corner.
const SNAP_THRESHOLD_PX = 120;

export default function DashboardWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidePane = useComposerStore((s) => s.sidePane);
  const chatMaximised = useComposerStore((s) => s.chatMaximised);

  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const constraintRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = () => {
    if (
      Math.abs(x.get()) < SNAP_THRESHOLD_PX &&
      Math.abs(y.get()) < SNAP_THRESHOLD_PX
    ) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 40 });
    }
  };

  const col = {
    w: { base: "full", md: `${PANEL_WIDTH}px` },
    flexShrink: 0,
    h: "100%",
    display: { base: "none", md: "block" } as const,
    borderRightWidth: "1px",
    borderColor: "border",
  };

  return (
    <Box flex="1 1 auto" minH={0} position="relative" overflow="hidden">
      <Flex h="100%">
        {/* Full-sized chat — docked to the LEFT of the side panel. */}
        {chatMaximised && (
          <Box {...col}>
            <DashboardChatPanel />
          </Box>
        )}
        {/* Side panel — full height, independent of the chat. */}
        {sidePane && (
          <Box {...col}>
            <DashboardSidePanel />
          </Box>
        )}
        {/* Dashboard content. */}
        <Box flex="1 1 auto" minW={0} h="100%" overflowY="auto" bg="bg.subtle">
          {children}
        </Box>
      </Flex>

      {/* Floating chat — overlay, only when not full-sized. Offset right of the
          side panel (when open) so it doesn't cover it by default. */}
      {!chatMaximised && (
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
              left: sidePane ? PANEL_WIDTH + 24 : 12,
              pointerEvents: "auto",
              userSelect: "none",
            }}
          >
            <Box h={{ base: "70dvh", md: "560px" }} maxH="calc(100dvh - 96px)">
              <DashboardChatPanel floating dragControls={dragControls} />
            </Box>
          </motion.div>
        </Box>
      )}
    </Box>
  );
}
