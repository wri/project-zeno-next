"use client";

import { useEffect } from "react";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "../store/contextStore";

export default function Home() {
  const { reset: resetChatStore } = useChatStore();
  const { reset: resetContextStore } = useContextStore();

  useEffect(() => {
    resetChatStore();
    resetContextStore();
  }, [resetChatStore, resetContextStore]);

  return null; // The layout handles all the UI
}
