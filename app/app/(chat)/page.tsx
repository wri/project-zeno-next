"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";

export default function Home() {
  const { reset: resetChatStore, sendMessage } = useChatStore();
  const { reset: resetContextStore } = useContextStore();
  const searchParams = useSearchParams();
  useEffect(() => {
    resetChatStore();
    resetContextStore();
  }, [resetChatStore, resetContextStore]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && typeof sendMessage === "function") {
      sendMessage(prompt);
    }
  }, [sendMessage, searchParams]);
  return null; // The layout handles all the UI
}
