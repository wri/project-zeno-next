import { create } from "zustand";

/**
 * Selected agent profile, activated via the `?agent_profile=<slug>` URL param
 * and sent as `ff` on POST /api/chat to pick the backend agent tool profile.
 *
 * The value is captured once on mount and persisted, because the chat replaces
 * the URL with `/app/threads/:id` after the first message (dropping the query
 * param) — reading the live URL would silently disable the profile mid-thread.
 *
 * Whether the flag is actually sent is gated by user type at the call sites
 * (see `effectiveAgentProfile` in config/feature-flags), since the backend only
 * honours `ff` for admin/superuser/machine users.
 */

const STORAGE_KEY = "agent_profile";
const PARAM = "agent_profile";
// Explicit values that clear the profile (turn the experimental agent off).
const RESET_VALUES = new Set(["", "default", "off", "none"]);

interface AgentProfileState {
  agentProfile: string | null;
  setAgentProfile: (profile: string | null) => void;
  /** Seed from the URL once on client mount; else keep the persisted value. */
  initFromUrl: () => void;
}

function readPersisted(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function persist(profile: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (profile) window.localStorage.setItem(STORAGE_KEY, profile);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures (private mode, quota, disabled cookies).
  }
}

const useAgentProfileStore = create<AgentProfileState>((set) => ({
  agentProfile: readPersisted(),
  setAgentProfile: (profile) => {
    persist(profile);
    set({ agentProfile: profile });
  },
  initFromUrl: () => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get(PARAM);
    // No param present: preserve whatever was previously persisted.
    if (raw === null) return;
    const trimmed = raw.trim();
    const next = RESET_VALUES.has(trimmed.toLowerCase()) ? null : trimmed;
    persist(next);
    set({ agentProfile: next });
  },
}));

export default useAgentProfileStore;
