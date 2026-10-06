/** How users get into the tour: the review flag and the start link. */

/** Hidden-feature flag gating the tour while it's in review: `?ff=onboarding`. */
export const ONBOARDING_FEATURE_FLAG = "onboarding";

/** Query param that starts the first-run tour, e.g. `/app?ff=onboarding&tour`. */
export const START_TOUR_PARAM = "tour";

const FEATURE_FLAGS_PARAM = "ff";

/**
 * Link that starts the tour on a fresh conversation. Carries only the `ff`
 * flags over: other params (e.g. a landing `?prompt=`) must not ride along,
 * or the new conversation would act on them while the tour starts.
 */
export function startTourHref(currentSearch: string): string {
  const flags = new URLSearchParams(currentSearch).get(FEATURE_FLAGS_PARAM);
  const params = new URLSearchParams(
    flags ? { [FEATURE_FLAGS_PARAM]: flags } : {}
  );
  params.set(START_TOUR_PARAM, "1");
  return `/app?${params.toString()}`;
}
