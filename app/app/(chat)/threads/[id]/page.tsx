"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";

export default function SingleThread() {
  const { id } = useParams();
  const {
    reset: resetChatStore,
    fetchThread,
    currentThreadId,
  } = useChatStore();
  const { reset: resetContextStore } = useContextStore();

  // This check should only happen on mount. When coming from a thread started
  // at the root page the context should be preserved.
  const comingFromNewThread = useMemo(() => id === currentThreadId, []);

  useEffect(() => {
    if (!comingFromNewThread) {
      resetChatStore();
      resetContextStore();
    }
  }, [comingFromNewThread, resetChatStore, resetContextStore]);

  useEffect(() => {
    if (!currentThreadId && id) {
      const abortController = new AbortController();
      fetchThread(id as string, abortController);

      return () => {
        // Cleanup function to abort the fetch if the component unmounts.
        // This happens during development because of React Strict Mode.
        abortController.abort();
      };
    }
  }, [currentThreadId, id, fetchThread]);

  return null; // The layout handles the UI
}
