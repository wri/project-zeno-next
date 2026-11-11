/**
 * Public API of the `onboarding` feature (FSD slice): the first-run guided
 * tour ("by hand, then by chat") and the follow-up checklist.
 *
 * Gated behind `?ff=onboarding` while in review; `&tour` starts the tour.
 * Tour targets are marked with `@/src/shared/lib/tour-anchors`.
 */
export { OnboardingTour } from "./ui/OnboardingTour";
export { OnboardingChecklist } from "./ui/OnboardingChecklist";
export { useIsTourActive } from "./ui/use-is-tour-active";
export {
  ONBOARDING_FEATURE_FLAG,
  TAKE_THE_TOUR_LABEL,
  startTourHref,
} from "./ui/tour-entry";
