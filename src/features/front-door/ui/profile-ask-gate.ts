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
 * menu): someone is signed in and their profile is incomplete. Otherwise
 * the surfaces that check it render nothing.
 */
export function selectProfileAskActive(state: AuthState): boolean {
  return state.isAuthenticated && !state.hasProfile;
}

export function useProfileAskActive(): boolean {
  return useAuthStore(selectProfileAskActive);
}

/** The same gate, outside React. */
export function isProfileAskActive(): boolean {
  return selectProfileAskActive(useAuthStore.getState());
}
