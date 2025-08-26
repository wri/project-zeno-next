"use client";

import { useEffect } from "react";
import useChatStore from "@/app/store/chatStore";

export default function Home() {
  const { reset: resetChatStore, currentThreadId } = useChatStore();

  useEffect(() => {
    resetChatStore();
  }, [resetChatStore]);

  useEffect(() => { // Update URL as soon as threadID is available
    if (currentThreadId) {
      const newUrl = `/app/threads/${currentThreadId}`;
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl
      );
    }
  }, [currentThreadId]);
  return null; // The layout handles all the UI
}
