/**
 * Hardcoded agent feature flags for this frontend branch.
 *
 * `AGENT_FEATURE_FLAG` is sent as `ff` on POST /api/chat and selects the
 * backend agent profile (see project-zeno `EXPERIMENTAL_PROFILE`).
 * Set to `null` to use the default profile.
 */
export const AGENT_FEATURE_FLAG: "experimental" | null = "experimental";

export function isExperimentalProfileEnabled(): boolean {
  return AGENT_FEATURE_FLAG !== null;
}
