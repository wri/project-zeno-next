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
 * Distinct from `src/shared/lib/feature-flags`, which gates FE-only hidden
 * features via the `?ff=` URL param.
 */

export const EXPERIMENTAL_PROFILE = "experimental";

/**
 * The default agent profile with the LGMS dataset revealed. Unlike the other
 * profiles, the backend accepts it from every user type (project-zeno #842).
 */
export const LGMS_PROFILE = "lgms";

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

/**
 * The `ff` to send on POST /api/chat, or null to omit it. Privileged users get
 * their selected profile, defaulting to experimental (which holds the dashboard
 * tools and already reveals LGMS). Everyone else gets the public LGMS profile
 * when the `net-flux` URL flag is on, so the agent can use the data that flag
 * shows in the catalog and on the map.
 */
export function chatFeatureFlag(
  agentProfile: string | null,
  userType: UserType | null,
  netFluxEnabled: boolean
): string | null {
  if (canUseFeatureFlags(userType)) return agentProfile ?? EXPERIMENTAL_PROFILE;
  return netFluxEnabled ? LGMS_PROFILE : null;
}

/** Whether the experimental agent profile is active for this user. */
export function isExperimentalProfileEnabled(
  agentProfile: string | null,
  userType: UserType | null
): boolean {
  return effectiveAgentProfile(agentProfile, userType) === EXPERIMENTAL_PROFILE;
}
