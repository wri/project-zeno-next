"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChatPanelCompact from "./ChatPanelCompact";
import ChatPanelFullSize from "./ChatPanelFullSize";
import useSidebarStore from "./store/sidebarStore";

function ChatPanel() {
  const [isFullSize, setIsFullSize] = useState(false);
  const { setChatFullSize } = useSidebarStore();

  const toggleSize = () => {
    setIsFullSize((prev) => {
      setChatFullSize(!prev);
      return !prev;
    });
  };

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
