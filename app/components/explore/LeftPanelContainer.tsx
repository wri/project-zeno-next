"use client";

import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import useExplorePanelStore from "@/app/store/explorePanelStore";
import ChatPanel from "@/app/ChatPanel";
import MinimizedInput from "./MinimizedInput";
import DatasetBrowserPanel from "./DatasetBrowserPanel";
import ThreadHistoryPanel from "./ThreadHistoryPanel";

const PANEL_WIDTH = 420;
const SLIDE_DURATION_MS = 280;

export default function LeftPanelContainer() {
  const { panelState, panelReady, setPanelReady } = useExplorePanelStore();
  const isOpen = panelState !== "minimized";
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setPanelReady(false);
      const timer = setTimeout(() => setPanelReady(true), SLIDE_DURATION_MS);
      wasOpen.current = true;
      return () => clearTimeout(timer);
    } else {
      setPanelReady(false);
      wasOpen.current = false;
    }
  }, [isOpen, panelState, setPanelReady]);

  return (
    <Box
      position="absolute"
      left={0}
      top={0}
      bottom={0}
      zIndex={400}
      pointerEvents="none"
      hideBelow="md"
    >
      {/* Sliding panel wrapper */}
      <Box
        h="100%"
        w={`${PANEL_WIDTH}px`}
        transform={isOpen ? "translateX(0)" : "translateX(-100%)"}
        transition={`transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        {/* Shared panel chrome */}
        <Box
          h="100%"
          w="100%"
          bg="bg"
          shadow={isOpen ? "xl" : "none"}
          borderRight="1px solid"
          borderColor="border.muted"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {/* Content — fades in after slide completes */}
          <Box
            opacity={panelReady ? 1 : 0}
            transition="opacity 0.15s ease"
            display="flex"
            flexDirection="column"
            h="100%"
            w="100%"
          >
            {/* Chat panel — kept mounted, toggled via display for scroll/state preservation */}
            <Box
              display={panelState === "chat" ? "flex" : "none"}
              flexDirection="column"
              h="100%"
              w="100%"
            >
              <ChatPanel />
            </Box>

            {/* Dataset browser */}
            {panelState === "dataset" && <DatasetBrowserPanel />}

            {/* Thread history */}
            {panelState === "threads" && <ThreadHistoryPanel />}
          </Box>
        </Box>
      </Box>

      {/* Minimized input — shown at bottom-left when panel is closed */}
      <Box
        position="absolute"
        bottom={4}
        left={4}
        pointerEvents="auto"
        opacity={panelState === "minimized" ? 1 : 0}
        transform={
          panelState === "minimized" ? "translateY(0)" : "translateY(8px)"
        }
        transition="opacity 0.2s ease, transform 0.2s ease"
        visibility={panelState === "minimized" ? "visible" : "hidden"}
      >
        <MinimizedInput />
      </Box>
    </Box>
  );
}

export { PANEL_WIDTH };
