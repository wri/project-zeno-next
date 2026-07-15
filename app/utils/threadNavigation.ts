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
 * The canonical map URL for a thread, carrying the hidden-feature flags
 * (?ff=…) from the given `location.search` — dropping them closes the
 * dashboards feature gate on the next navigation or refresh. Other params
 * are deliberately not carried over (e.g. a landing ?prompt= must not ride
 * along).
 */
export function threadHref(threadId: string, search?: string | null): string {
  const ff = search ? new URLSearchParams(search).get("ff") : null;
  return ff
    ? `/app/threads/${threadId}?${new URLSearchParams({ ff })}`
    : `/app/threads/${threadId}`;
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
  threadId: string,
  search?: string | null
): string | null {
  if (!isAppRoute(pathname)) return null;
  return threadHref(threadId, search);
}

/**
 * What clicking a conversation in the history sidebar should do.
 *
 * A dashboard detail page hosts its own chat panel, and its URL doesn't
 * encode the conversation (ADR-003) — so resuming a past conversation there
 * loads the thread into the global chat store in place, keeping the user on
 * the dashboard. Everywhere else (map, dashboards list — which has no chat
 * panel) the click navigates to the thread's canonical map URL, carrying
 * `?ff=…` so hidden feature gates stay open.
 */
export function threadClickTarget(
  pathname: string | null,
  threadId: string,
  search?: string | null
): { kind: "load-in-place" } | { kind: "navigate"; href: string } {
  if (/^\/dashboards\/./.test(pathname ?? "")) {
    return { kind: "load-in-place" };
  }
  return { kind: "navigate", href: threadHref(threadId, search) };
}

/**
 * What the header's "New conversation" (+) control should do.
 *
 * A dashboard detail page hosts its own chat panel, so starting a new
 * conversation there must not navigate away — the conversation is global
 * session state that dashboard URLs don't encode (see ADR-003), so the
 * caller resets the stores in place instead. Everywhere else the button
 * navigates to the map's new-thread route, carrying `?ff=dashboard` when the
 * feature gate is open so the navigation doesn't close it.
 */
export function newConversationTarget(
  pathname: string | null,
  dashboardFeatureEnabled: boolean
): { kind: "reset-in-place" } | { kind: "navigate"; href: string } {
  if (/^\/dashboards\/./.test(pathname ?? "")) {
    return { kind: "reset-in-place" };
  }
  return {
    kind: "navigate",
    href: dashboardFeatureEnabled ? "/app?ff=dashboard" : "/app",
  };
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
