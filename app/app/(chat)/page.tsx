"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { Loader } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { DATASET_CARDS } from "@/app/constants/datasets";
import { getLayerContextFromDatasetCard } from "@/app/utils/datasetCardLayerContext";
import { buildDatasetLayers } from "@/app/utils/datasetLayerContext";
import { firstMessageRedirectPath } from "@/app/utils/threadNavigation";

const DEFAULT_LANDING_DATASET_ID = 4;

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

  useEffect(() => {
    // /app is the fresh-landing / new-thread surface: clear any conversation
    // and map state left in the (singleton) stores, then seed Tree Cover Loss
    // as the default active layer so an idle map always looks like a first
    // visit. A live conversation never reaches this page — the header's Map tab
    // links straight to the thread URL — so this only runs when no conversation
    // has started.
    //
    // Seed here, right after resetMapStore() has emptied the layers, reading
    // the store via getState() rather than a render-time `layers` snapshot: an
    // earlier /app visit leaves the seeded TCL layer in the singleton store,
    // and deciding against that stale pre-reset snapshot used to mark the map
    // "already seeded" and suppress re-seeding when returning from the
    // dashboards view.
    resetChatStore();
    resetMapStore();

    const { layers, addLayer } = useMapStore.getState();
    const hasDatasetLayer = layers.some((l) => typeof l.datasetId === "number");
    if (hasDatasetLayer) return;

    const defaultCard = DATASET_CARDS.find(
      (card) => card.dataset_id === DEFAULT_LANDING_DATASET_ID
    );
    if (!defaultCard) return;

    buildDatasetLayers(getLayerContextFromDatasetCard(defaultCard)).forEach(
      addLayer
    );
  }, [resetChatStore, resetMapStore]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const submitPrompt = useCallback(
    async (prompt: string) => {
      const result = await sendMessage(prompt);
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
