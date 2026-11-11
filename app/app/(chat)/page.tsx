import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "@/src/shared/lib/router";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
import {
  getDefaultDatasetId,
  seedDefaultDatasetLayer,
} from "@/app/utils/defaultMapLayers";
import { firstMessageRedirectPath } from "@/app/utils/threadNavigation";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags/use-feature-flag";

export default function NewThread() {
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
  const defaultDatasetId = getDefaultDatasetId(isNetFlux);

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    seedDefaultDatasetLayer(defaultDatasetId);
  }, [resetChatStore, resetMapStore, defaultDatasetId]);

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
