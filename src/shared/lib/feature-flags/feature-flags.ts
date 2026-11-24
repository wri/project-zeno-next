/**
 * Hidden-feature gate. Flags are opt-in via a single comma-separated URL param,
 * e.g. `?ff=analysis` or `?ff=analysis,other`. Reusable across features so each
 * new hidden feature shares one convention.
 */
const FLAGS_PARAM = "ff";

/**
 * The full set of flags opted into by the URL. Callers that gate a list against
 * many flags at once (e.g. the dataset catalogue) read the set instead of
 * calling `isFeatureEnabled` per flag, so one parse serves every check.
 */
export function enabledFlags(params: URLSearchParams): Set<string> {
  const raw = params.get(FLAGS_PARAM);
  if (!raw) return new Set();
  // Empty tokens (`?ff=foo,,bar`, `?ff=,`) are dropped so the set only ever
  // holds real flag names and `has("")` can never match.
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isFeatureEnabled(
  params: URLSearchParams,
  flag: string
): boolean {
  return enabledFlags(params).has(flag);
}

/**
 * `href` (a path with no query) carrying the URL's `?ff=…` flags, so a link
 * inside a flagged feature does not close the gate on the next page.
 */
export function withFlags(href: string, params: URLSearchParams): string {
  const ff = params.get(FLAGS_PARAM);
  return ff ? `${href}?${new URLSearchParams({ ff })}` : href;
}

// A scheme (`https:`, `mailto:`) or a protocol-relative `//host` leaves the app.
const EXTERNAL_HREF = /^([a-z][a-z\d+.-]*:|\/\/)/i;

/**
 * `href` with the `?ff=…` flags of `currentSearch` added. The router applies
 * it to every in-app navigation, so flags opted into once stay on from page to
 * page rather than each link having to carry them. An href that leaves the
 * app or sets its own `ff` is returned unchanged. The href's existing query is
 * appended to, not re-serialised, so its encoding is kept as written.
 */
export function carryFlags(href: string, currentSearch: string): string {
  const ff = new URLSearchParams(currentSearch).get(FLAGS_PARAM);
  if (!ff || EXTERNAL_HREF.test(href)) return href;

  const hashAt = href.indexOf("#");
  const path = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const queryAt = path.indexOf("?");
  const query = queryAt === -1 ? "" : path.slice(queryAt + 1);
  if (new URLSearchParams(query).has(FLAGS_PARAM)) return href;

  const separator =
    queryAt === -1 ? "?" : query === "" || query.endsWith("&") ? "" : "&";
  return `${path}${separator}${new URLSearchParams({ ff })}${hash}`;
}
