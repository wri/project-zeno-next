/** How users get into the tour: the review flag and the start link. */

/** Hidden-feature flag gating the tour while it's in review: `?ff=onboarding`. */
export const ONBOARDING_FEATURE_FLAG = "onboarding";

/** Query param that starts the first-run tour, e.g. `/app?ff=onboarding&tour`. */
export const START_TOUR_PARAM = "tour";

const FEATURE_FLAGS_PARAM = "ff";

/** The question the landing hero (or What's new) hands a new conversation. */
const LANDING_PROMPT_PARAM = "prompt";

/** The route of a fresh conversation, the only place the tour starts. */
const NEW_CONVERSATION_PATH = "/app";

export interface TourStartContext {
  pathname: string;
  params: Pick<URLSearchParams, "has">;
  /** No first-run outcome recorded yet (never finished or skipped). */
  firstVisit: boolean;
  /** A question was already sent in this conversation (it has a thread). */
  conversationStarted: boolean;
}

/**
 * Whether to start the first-run tour. Only on a fresh conversation: the
 * tour clears the map and walks the user through sending a question, so not
 * on a thread page nor once a question has been sent. There, `?tour` (the
 * "Take the tour" link) always starts it; a first visit starts it unless the
 * URL carries a `?prompt=`, which the page sends at once and whose answer the
 * tour would clear. No outcome is recorded then, so the next plain `/app`
 * visit starts it.
 */
export function shouldStartTour(context: TourStartContext): boolean {
  const { pathname, params, firstVisit, conversationStarted } = context;
  if (pathname !== NEW_CONVERSATION_PATH || conversationStarted) return false;
  if (params.has(START_TOUR_PARAM)) return true;
  return firstVisit && !params.has(LANDING_PROMPT_PARAM);
}

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
