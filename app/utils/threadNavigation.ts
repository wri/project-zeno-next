/**
 * Whether the pathname is inside the /app route group — the map surface.
 * The chat renders on other surfaces too (dashboard pages), where
 * map-coupled behaviours (thread URL rewriting, the catalog/areas panel
 * toggles and the layout offset they drive) must not apply.
 */
export function isAppRoute(pathname: string | null): boolean {
  return pathname === "/app" || !!pathname?.startsWith("/app/");
}

/**
 * Where to send the browser after the first message of a new thread.
 *
 * Only the map surface rewrites its URL to the canonical thread route.
 * On other chat surfaces (dashboard pages) the conversation lives in the
 * chat store and the user stays where they are — returning to the map via
 * the header's thread-aware Map tab lands on the thread URL with state
 * intact. Returns null when no navigation should happen.
 */
export function firstMessageRedirectPath(
  pathname: string | null,
  threadId: string
): string | null {
  return isAppRoute(pathname) ? `/app/threads/${threadId}` : null;
}

/**
 * The header Map tab's destination. `/app` mounts the new-thread page, which
 * resets the chat and map stores — correct when nothing is under way, but it
 * would wipe a live conversation when returning from a dashboard. With an
 * active thread the tab links to its canonical URL instead: the thread page
 * skips its reset when the store already holds that thread. The `ff`
 * param keeps the dashboards feature gate open across navigation (the tab
 * only renders when that gate is on).
 */
export function mapTabHref(currentThreadId: string | null): string {
  return currentThreadId
    ? `/app/threads/${currentThreadId}?ff=dashboard`
    : "/app?ff=dashboard";
}
