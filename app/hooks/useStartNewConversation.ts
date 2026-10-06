"use client";

import { useCallback } from "react";

import { usePathname, useRouter } from "@/app/lib/router";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { newConversationTarget } from "@/app/utils/threadNavigation";

/**
 * Starts a new conversation from wherever the chat is. On the map it
 * navigates to `/app`, whose new-thread page resets the stores on mount. A
 * dashboard detail page hosts its own chat panel and its URL doesn't carry
 * the conversation (ADR-003), so there the stores are reset in place instead
 * of navigating away from the page the user is working on.
 */
export function useStartNewConversation(): () => void {
  const pathname = usePathname();
  const router = useRouter();

  return useCallback(() => {
    const target = newConversationTarget(pathname);
    if (target.kind === "reset-in-place") {
      useChatStore.getState().reset();
      useMapStore.getState().reset();
    } else {
      router.push(target.href);
    }
  }, [pathname, router]);
}
