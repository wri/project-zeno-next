"use client";

import { AnimatePresence, motion } from "framer-motion";
import ChatPanelCompact from "./ChatPanelCompact";
import ChatPanelFullSize from "./ChatPanelFullSize";
import useSidebarStore from "./store/sidebarStore";

function ChatPanel() {
  // The store is the single source of truth for panel size. Layout consumers
  // (map controls, dashboard content offset) read isChatFullSize, and the
  // panel remounts across surfaces (map ↔ dashboard) — local state here would
  // reset to compact while the store kept reporting full-size.
  const isFullSize = useSidebarStore((s) => s.isChatFullSize);
  const setChatFullSize = useSidebarStore((s) => s.setChatFullSize);

  const toggleSize = () => setChatFullSize(!isFullSize);

  return (
    <AnimatePresence mode="wait">
      {isFullSize ? (
        <motion.div
          key="fullsize"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            height: "100%",
          }}
        >
          <ChatPanelFullSize onToggleSize={toggleSize} />
        </motion.div>
      ) : (
        <motion.div
          key="compact"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <ChatPanelCompact onToggleSize={toggleSize} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ChatPanel;
