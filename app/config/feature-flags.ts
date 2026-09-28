import type { UserType } from "@/app/schemas/api/admin/users/get";
import { NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";

/**
 * Agent profile feature flag.
 *
 * The selected profile (from `agentProfileStore`, activated via
 * `?agent_profile=<slug>`) is sent as `ff` on POST /api/chat and selects the
 * backend agent tool profile (see project-zeno `EXPERIMENTAL_PROFILE`).
 *
 * The backend rejects `ff` from non-privileged users (403), except for the
 * public profiles (project-zeno `PUBLIC_PROFILES`). So a public profile is sent
 * for every user, and any other profile only for admin/superuser/machine
 * accounts. These helpers are pure so both the request builder (chatStore) and
 * the render gate (MessageBubble) derive the same effective value from a
 * single place.
 *
 * Distinct from `src/shared/lib/feature-flags`, which gates FE-only hidden
 * features via the `?ff=` URL param.
 */

export const EXPERIMENTAL_PROFILE = "experimental";

/**
 * The default agent profile with the LGMS dataset revealed. Open to every user;
 * sent when the `net-flux` URL flag is on (see `chatFeatureFlag`).
 */
export const LGMS_PROFILE = "lgms";

// Profiles the backend accepts from every user type (chat.py
// `PUBLIC_PROFILES`).
const PUBLIC_PROFILES: ReadonlySet<string> = new Set([LGMS_PROFILE]);

// User types the backend accepts any feature flag from (chat.py: everyone else
// gets a 403 for a flag that isn't a public profile).
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
 * profile selected, or the profile isn't public and the user type isn't
 * allowed to use feature flags).
 */
export function effectiveAgentProfile(
  agentProfile: string | null,
  userType: UserType | null
): string | null {
  if (!agentProfile) return null;
  return PUBLIC_PROFILES.has(agentProfile) || canUseFeatureFlags(userType)
    ? agentProfile
    : null;
}

/**
 * The `ff` to send on POST /api/chat, or null to omit it.
 *
 * An explicit `?agent_profile=` wins when the backend accepts it. Otherwise
 * privileged users get the experimental profile, which holds the dashboard
 * tools and already reveals LGMS. Other users get the LGMS profile when the
 * `net-flux` URL flag is on, so the agent can use the LGMS data that flag
 * shows in the catalog and on the map.
 */
export function chatFeatureFlag(
  agentProfile: string | null,
  userType: UserType | null,
  urlFlags: ReadonlySet<string>
): string | null {
  const explicit = effectiveAgentProfile(agentProfile, userType);
  if (explicit) return explicit;
  if (canUseFeatureFlags(userType)) return EXPERIMENTAL_PROFILE;
  return urlFlags.has(NET_FLUX_FEATURE_FLAG) ? LGMS_PROFILE : null;
}

/** Whether the experimental agent profile is active for this user. */
export function isExperimentalProfileEnabled(
  agentProfile: string | null,
  userType: UserType | null
): boolean {
  return effectiveAgentProfile(agentProfile, userType) === EXPERIMENTAL_PROFILE;
}
