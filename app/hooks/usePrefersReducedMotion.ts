"use client";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// SSR: assume no preference; the client snapshot corrects on hydration.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Reactively tracks the user's `prefers-reduced-motion` setting so
 * chart/workspace animations can be disabled for motion-sensitive users.
 */
export default function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
