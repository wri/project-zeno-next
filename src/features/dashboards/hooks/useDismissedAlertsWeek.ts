import { useSyncExternalStore } from "react";

const KEY_PREFIX = "gnw_dashboard_alerts_dismissed:";
const DISMISSED_EVENT = "gnw-dashboard-alerts-dismissed";

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(DISMISSED_EVENT, onStoreChange);
  // A dismissal in another tab hides the strip here too.
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(DISMISSED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readDismissedWeek(dashboardId: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + dashboardId);
  } catch {
    return null;
  }
}

/**
 * The alert week (its end date) the viewer dismissed the weekly alerts strip
 * for on this dashboard, and the dismiss action. Per browser and per week:
 * the strip comes back when the next week's data arrives. Storage is the
 * store, as in `useWhatsNewUnread`, so the value follows the dashboard id
 * and other tabs without the caller re-keying anything.
 */
export function useDismissedAlertsWeek(
  dashboardId: string
): [dismissedWeek: string | null, dismiss: (weekEnd: string) => void] {
  const dismissedWeek = useSyncExternalStore(
    subscribe,
    () => readDismissedWeek(dashboardId),
    () => null
  );

  const dismiss = (weekEnd: string) => {
    try {
      localStorage.setItem(KEY_PREFIX + dashboardId, weekEnd);
    } catch {
      // Storage blocked: nothing persists, so the strip stays this visit.
    }
    window.dispatchEvent(new CustomEvent(DISMISSED_EVENT));
  };

  return [dismissedWeek, dismiss];
}
