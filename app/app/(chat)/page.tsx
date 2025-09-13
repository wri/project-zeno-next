"use client";

import { useEffect, useState, Suspense } from "react";
import { Loader } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";

function NewThread() {
  const {
    reset: resetChatStore,
    sendMessage,
    currentThreadId,
  } = useChatStore();
  const { reset: resetContextStore } = useContextStore();
  const { reset: resetMapStore } = useMapStore();
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();
  }, [resetChatStore, resetContextStore, resetMapStore]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    const prompt = searchParams.get("prompt");
    if (prompt && typeof sendMessage === "function" && !currentThreadId) {
      sendMessage(prompt);
    }
  }, [hasMounted, sendMessage, searchParams, currentThreadId]);

  return null;
}

export default function AppPage() {
  return (
    <Suspense fallback={<Loader />}>
      <NewThread />
    </Suspense>
  );
}