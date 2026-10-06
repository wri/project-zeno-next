"use client";
import { useSyncExternalStore } from "react";

// Bump the version (and add the old key to WhatsNewModal's LEGACY_STORAGE_KEYS)
// to re-surface "What's new" for everyone.
export const WHATS_NEW_STORAGE_KEY = "whats-new-v5-dismissed";
export const WHATS_NEW_OPEN_EVENT = "gnw-whats-new-open";
const WHATS_NEW_READ_EVENT = "gnw-whats-new-dismissed";

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(WHATS_NEW_READ_EVENT, onStoreChange);
  // Reading in another tab clears the signal here too.
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(WHATS_NEW_READ_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY) !== "true";
  } catch {
    return false;
  }
}

// SSR: no signal; the client snapshot corrects on hydration.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Whether the user has unread "What's new" updates. Every entry point (menu
 * badge, header icon) reads this one source so their signals always agree.
 */
export function useWhatsNewUnread(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Opens the What's new panel and marks its updates as read. */
export function openWhatsNew(): void {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
  } catch {
    // Storage blocked: the panel still opens, the signal just can't persist.
  }
  window.dispatchEvent(new CustomEvent(WHATS_NEW_READ_EVENT));
  window.dispatchEvent(new CustomEvent(WHATS_NEW_OPEN_EVENT));
}
