"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Loader } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import { DATASET_CARDS } from "@/app/constants/datasets";
import { getLayerContextFromDatasetCard } from "@/app/utils/datasetCardLayerContext";
import { buildDatasetLayers } from "@/app/utils/datasetLayerContext";

const DEFAULT_LANDING_DATASET_ID = 4;

function NewThread() {
  const {
    reset: resetChatStore,
    sendMessage,
    currentThreadId,
  } = useChatStore();
  const { reset: resetContextStore } = useContextStore();
  const { reset: resetMapStore, addLayer, layers } = useMapStore();
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const defaultLayerSeededRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();
    defaultLayerSeededRef.current = false;
  }, [resetChatStore, resetContextStore, resetMapStore]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (defaultLayerSeededRef.current) return;

    const hasDatasetLayer = layers.some((l) => typeof l.datasetId === "number");
    if (hasDatasetLayer) {
      defaultLayerSeededRef.current = true;
      return;
    }

    const defaultCard = DATASET_CARDS.find(
      (card) => card.dataset_id === DEFAULT_LANDING_DATASET_ID
    );
    if (!defaultCard) return;

    buildDatasetLayers(getLayerContextFromDatasetCard(defaultCard)).forEach(
      addLayer
    );
    defaultLayerSeededRef.current = true;
  }, [layers, addLayer]);

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
