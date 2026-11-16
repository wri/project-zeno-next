import useOnboardingStore, {
  selectTourActive,
} from "../model/onboarding-store";

/**
 * Whether a tour (first-run or a checklist walkthrough) is running, so the
 * app can hold back other asks meanwhile, e.g. the front door's profile ask
 * in the chat layout. Always false with the onboarding flag off.
 */
export function useIsTourActive(): boolean {
  return useOnboardingStore(selectTourActive);
}
