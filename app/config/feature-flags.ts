import type { UserType } from "@/app/schemas/api/admin/users/get";

/**
 * Agent profile feature flag.
 *
 * The selected profile (from `agentProfileStore`, activated via
 * `?agent_profile=<slug>`) is sent as `ff` on POST /api/chat and selects the
 * backend agent tool profile (see project-zeno `EXPERIMENTAL_PROFILE`).
 *
 * The backend rejects `ff` from non-privileged users (403), so the flag is only
 * applied for admin/superuser/machine accounts. These helpers are pure so both
 * the request builder (chatStore) and the render gate (MessageBubble) derive
 * the same effective value from a single place.
 *
 * Distinct from `app/lib/feature-flags.ts`, which gates FE-only hidden features
 * via the `?ff=` URL param.
 */

export const EXPERIMENTAL_PROFILE = "experimental";

// User types the backend accepts a feature flag from (chat.py: everyone else
// gets a 403 "Feature flags require admin access").
const FEATURE_FLAG_USER_TYPES: ReadonlySet<UserType> = new Set([
  "admin",
  "superuser",
  "machine",
]);

/** Whether the backend will honour a feature flag from this user type. */
export function canUseFeatureFlags(userType: UserType | null): boolean {
  return userType !== null && FEATURE_FLAG_USER_TYPES.has(userType);
}

/**
 * The agent profile to send as `ff`, or null when it must be omitted (no
 * profile selected, or the user type isn't allowed to use feature flags).
 */
export function effectiveAgentProfile(
  agentProfile: string | null,
  userType: UserType | null
): string | null {
  return agentProfile && canUseFeatureFlags(userType) ? agentProfile : null;
}

/** Whether the experimental agent profile is active for this user. */
export function isExperimentalProfileEnabled(
  agentProfile: string | null,
  userType: UserType | null
): boolean {
  return effectiveAgentProfile(agentProfile, userType) === EXPERIMENTAL_PROFILE;
}
