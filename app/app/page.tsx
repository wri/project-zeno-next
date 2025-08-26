"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useChatStore from "@/app/store/chatStore";

export default function Home() {
  const { reset: resetChatStore, sendMessage } = useChatStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    resetChatStore();

    const prompt = searchParams.get("prompt");
    if (prompt && typeof sendMessage === "function") {
      sendMessage(prompt);
    }
  }, [resetChatStore, sendMessage, searchParams]);

  return null; // The layout handles all the UI
}
