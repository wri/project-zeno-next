"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";

export default function SingleThread() {
  const { id } = useParams();
  const {
    reset: resetChatStore,
    fetchThread,
    currentThreadId,
  } = useChatStore();
  const { reset: resetContextStore } = useContextStore();
  const { reset: resetMapStore } = useMapStore();

  // This check should only happen on mount. When coming from a thread started
  // at the root page the context should be preserved.
  const comingFromNewThread = useMemo(() => id === currentThreadId, []);

  useEffect(() => {
    if (!comingFromNewThread) {
      resetChatStore();
      resetMapStore();
      resetContextStore();
    }
  }, [comingFromNewThread, resetChatStore, resetContextStore, resetMapStore]);

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
