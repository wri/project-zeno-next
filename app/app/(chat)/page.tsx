"use client";

import { useEffect, useState, Suspense } from "react";
import { Loader } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();
  }, [resetChatStore, resetContextStore, resetMapStore]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const submitPrompt = async (prompt: string) => {
    const result = await sendMessage(prompt);
    if (result.isNew) {
      router.replace(`/app/threads/${result.id}`);
    }
  };
  
  useEffect(() => {
    if (!hasMounted) return;
    const prompt = searchParams.get("prompt");
    if (prompt && !currentThreadId) {
      submitPrompt(prompt);
    }
  }, [hasMounted, submitPrompt, searchParams, currentThreadId]);

  return null;
}

export default function AppPage() {
  return (
    <Suspense fallback={<Loader />}>
      <NewThread />
    </Suspense>
  );
}