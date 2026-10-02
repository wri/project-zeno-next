import { isFrontDoorEnabled } from "@/app/config/front-door";
import useAuthStore from "@/app/store/authStore";

type AuthState = ReturnType<typeof useAuthStore.getState>;

/**
 * The key a person's profile-ask state and GFW prefill are stored under:
 * their user id, else their email; "" when nobody is signed in.
 */
export function selectProfileUserKey(state: AuthState): string {
  return state.userId || state.userEmail || "";
}

/**
 * The one gate for every profile ask and reminder (card, banner, account
 * menu): the front door is on, someone is signed in, and their profile is
 * incomplete. With the flag off this is always false, so the surfaces that
 * check it render nothing.
 */
export function selectProfileAskActive(state: AuthState): boolean {
  return isFrontDoorEnabled() && state.isAuthenticated && !state.hasProfile;
}

export function useProfileAskActive(): boolean {
  return useAuthStore(selectProfileAskActive);
}

/** The same gate, outside React. */
export function isProfileAskActive(): boolean {
  return selectProfileAskActive(useAuthStore.getState());
}
