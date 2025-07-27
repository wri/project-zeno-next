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
      fetchThread(id as string);
    }
  }, [id, fetchThread]);

  return null; // The layout handles the UI
}
