import useAuthStore from "@/app/store/authStore";

type AuthState = ReturnType<typeof useAuthStore.getState>;

/**
 * The key a person's profile-ask state and GFW prefill are stored under:
 * their user id, else their email; "" when nobody is signed in.
 */
export function selectProfileUserKey(state: AuthState): string {
  return state.userId || state.userEmail || "";
}
