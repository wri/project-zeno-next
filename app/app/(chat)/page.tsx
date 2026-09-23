"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { Loader } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "@/app/lib/router";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { DATASET_CARDS, NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
import { getLayerContextFromDatasetCard } from "@/app/utils/datasetCardLayerContext";
import { buildDatasetLayers } from "@/app/utils/datasetLayerContext";
import { firstMessageRedirectPath } from "@/app/utils/threadNavigation";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags/use-feature-flag";

const TCL_DATASET_ID = 4;
const LGMS_NET_FLUX_DATASET_ID = 12;

function NewThread() {
  const {
    reset: resetChatStore,
    sendMessage,
    currentThreadId,
  } = useChatStore();
  const { reset: resetMapStore } = useMapStore();
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();
  const isNetFlux = useFeatureFlag(NET_FLUX_FEATURE_FLAG);

  // NOTE: This is super custom code for ff=net-flux. We should remove asap.
  const defaultDatasetId = isNetFlux
    ? LGMS_NET_FLUX_DATASET_ID
    : TCL_DATASET_ID;

  useEffect(() => {
    resetChatStore();
    resetMapStore();

    const { layers, addLayer } = useMapStore.getState();
    const hasDatasetLayer = layers.some((l) => typeof l.datasetId === "number");
    if (hasDatasetLayer) return;

    const defaultCard = DATASET_CARDS.find(
      (card) => card.dataset_id === defaultDatasetId
    );
    if (!defaultCard) return;

    buildDatasetLayers(getLayerContextFromDatasetCard(defaultCard)).forEach(
      addLayer
    );
  }, [resetChatStore, resetMapStore, defaultDatasetId]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const submitPrompt = useCallback(
    async (prompt: string) => {
      const result = await sendMessage(prompt, { inputSource: "url_prompt" });
      if (result.isNew) {
        const redirect = firstMessageRedirectPath(
          window.location.pathname,
          result.id,
          window.location.search
        );
        if (redirect) router.replace(redirect);
      }
    },
    [sendMessage, router]
  );

  useEffect(() => {
    if (!hasMounted || !searchParams) return;
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
