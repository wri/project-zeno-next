import type { UserType } from "@/app/schemas/api/admin/users/get";

/**
 * Agent profile feature flag.
 *
 * The selected profile (from `agentProfileStore`, activated via
 * `?agent_profile=<slug>`) is sent as `ff` on POST /api/chat and selects the
 * backend agent tool profile (see project-zeno `EXPERIMENTAL_PROFILE`).
 *
 * The backend rejects `ff` from non-privileged users (403), except for the
 * public `lgms` profile. `chatFeatureFlag` picks the value chatStore sends.
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
  if (canUseFeatureFlags(userType)) return agentProfile || EXPERIMENTAL_PROFILE;
  return netFluxEnabled ? LGMS_PROFILE : null;
}
