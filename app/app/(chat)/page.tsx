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

  const { addContext } = useContextStore();

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();

    // Add Tree Cover Loss as the default visible layer on landing
    addContext({
      contextType: "layer",
      content: "Tree cover loss",
      datasetId: 4,
      tileUrl:
        "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=2001&end_year=2024&tree_cover_density_threshold=25&render_type=true_color",
      layerName: "Tree cover loss",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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