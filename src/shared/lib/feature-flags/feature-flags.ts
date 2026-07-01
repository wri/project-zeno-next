/**
 * Hidden-feature gate. Flags are opt-in via a single comma-separated URL param,
 * e.g. `?ff=analysis` or `?ff=analysis,other`. Reusable across features so each
 * new hidden feature shares one convention.
 */
const FLAGS_PARAM = "ff";

export function isFeatureEnabled(
  params: URLSearchParams,
  flag: string
): boolean {
  const raw = params.get(FLAGS_PARAM);
  if (!raw) return false;
  return raw
    .split(",")
    .map((value) => value.trim())
    .includes(flag);
}
