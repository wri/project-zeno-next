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
