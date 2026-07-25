"use client";

import { useCallback, useState } from "react";

/**
 * The dashboard detail page's presentation mode. `edit` is the full authoring
 * surface; `report` strips the editing chrome (card shells, drag handles,
 * action icons, chart toolbars, map controls) for a clean, document-like
 * read of the same widgets — hover interactivity on charts stays.
 */
export type DashboardMode = "edit" | "report";

/** Parse an explicit `?mode=` choice from a query string; null when absent or invalid. */
export function readModeFromSearch(search: string): DashboardMode | null {
  const value = new URLSearchParams(search).get("mode");
  return value === "edit" || value === "report" ? value : null;
}

/**
 * The query string with `mode` set (or removed when null), preserving every
 * other param — `ff=dashboard` in particular must survive the round-trip.
 * Returns "" or a "?"-prefixed string, ready to append to a pathname.
 */
export function searchWithMode(
  search: string,
  mode: DashboardMode | null
): string {
  const params = new URLSearchParams(search);
  if (mode === null) params.delete("mode");
  else params.set("mode", mode);
  const next = params.toString();
  return next ? `?${next}` : "";
}

/**
 * Mode state for the dashboard detail page, seeded from `?mode=` the same way
 * feature flags read the URL (window.location on first client render — during
 * SSR there is no URL, and nothing mode-dependent renders until the dashboard
 * query resolves client-side anyway). Without an explicit choice, owners get
 * the authoring surface and everyone else gets the report.
 *
 * The toggle writes the choice back with `history.replaceState` — a view
 * preference is ambient state like `ff`, not a navigation: no router
 * round-trip, no remounted widget tree, no history spam.
 */
export function useDashboardMode(isOwner: boolean): {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
} {
  const [choice, setChoice] = useState<DashboardMode | null>(() =>
    typeof window === "undefined"
      ? null
      : readModeFromSearch(window.location.search)
  );

  const mode = choice ?? (isOwner ? "edit" : "report");

  const setMode = useCallback((next: DashboardMode) => {
    setChoice(next);
    if (typeof window === "undefined") return;
    const { pathname, search, hash } = window.location;
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${searchWithMode(search, next)}${hash}`
    );
  }, []);

  return { mode, setMode };
}
