"use client";

import { useEffect } from "react";
import useChatStore from "@/app/store/chatStore";

export default function Home() {
  const { reset: resetChatStore } = useChatStore();

  useEffect(() => {
    resetChatStore();
  }, [resetChatStore]);

  return null; // The layout handles all the UI
}
