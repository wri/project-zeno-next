"use client";

import { Box } from "@chakra-ui/react";
import useExplorePanelStore from "@/app/store/explorePanelStore";
import ChatPanel from "@/app/ChatPanel";

const PANEL_WIDTH = 420;

export default function LeftPanelContainer() {
  const { panelState } = useExplorePanelStore();

  return (
    <Box
      position="absolute"
      left={0}
      top={0}
      bottom={0}
      zIndex={400}
      width={`${PANEL_WIDTH}px`}
      pointerEvents="none"
      transition="opacity 0.2s ease"
    >
      {/* Chat panel — kept mounted, toggled via display for scroll/state preservation */}
      <Box
        display={panelState === "chat" ? "flex" : "none"}
        flexDirection="column"
        h="100%"
        w="100%"
        bg="bg"
        pointerEvents="auto"
        shadow="lg"
        borderRight="1px solid"
        borderColor="border.muted"
      >
        <ChatPanel />
      </Box>

      {/* Dataset browser — Phase 3 placeholder */}
      {panelState === "dataset" && (
        <Box
          h="100%"
          w="100%"
          bg="bg"
          pointerEvents="auto"
          shadow="lg"
          borderRight="1px solid"
          borderColor="border.muted"
          p={4}
        >
          Dataset browser placeholder
        </Box>
      )}

      {/* Thread history — Phase 5 placeholder */}
      {panelState === "threads" && (
        <Box
          h="100%"
          w="100%"
          bg="bg"
          pointerEvents="auto"
          shadow="lg"
          borderRight="1px solid"
          borderColor="border.muted"
          p={4}
        >
          Thread history placeholder
        </Box>
      )}

      {/* Minimized input — Phase 1.3, placeholder for now */}
      {panelState === "minimized" && (
        <Box
          position="absolute"
          bottom={4}
          left={4}
          pointerEvents="auto"
        >
          {/* MinimizedInput will go here */}
        </Box>
      )}
    </Box>
  );
}

export { PANEL_WIDTH };
