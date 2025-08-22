"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import useChatStore from "@/app/store/chatStore";

export default function SingleThread() {
  const { id } = useParams();
  const { reset: resetChatStore, fetchThread } = useChatStore();

  useEffect(() => {
    resetChatStore();
  }, [resetChatStore]);

  useEffect(() => {
    if (id) {
      const abortController = new AbortController();
      fetchThread(id as string, abortController);

      return () => {
        // Cleanup function to abort the fetch if the component unmounts.
        // This happens during development because of React Strict Mode.
        abortController.abort();
      };
    }
  }, [id, fetchThread]);

  return null; // The layout handles the UI
}
