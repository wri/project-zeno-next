"use client";

import { useEffect } from "react";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";

export default function Home() {
  const { reset: resetChatStore } = useChatStore();
  const { reset: resetContextStore } = useContextStore();
  const { reset: resetMapStore } = useMapStore();

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();
  }, [resetChatStore, resetContextStore, resetMapStore]);

  return null; // The layout handles all the UI
}
