// app/store/cookieStore.ts
import { create } from "zustand";

export type ConsentStatus = "pending" | "accepted" | "rejected";

export const COOKIE_CONSENT_KEY = "gnw_cookie_consent";

export interface CookiePreferences {
  analytics: boolean;
  targetedAdvertising: boolean;
  personalization: boolean;
}

interface CookieStoredValue extends CookiePreferences {
  status: ConsentStatus;
}

interface CookieState extends CookiePreferences {
  consentStatus: ConsentStatus;
  preferencesOpen: boolean;
  hydrate: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
}

function persist(status: ConsentStatus, prefs: CookiePreferences) {
  const value: CookieStoredValue = { status, ...prefs };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
}

const ALL_ON: CookiePreferences = {
  analytics: true,
  targetedAdvertising: true,
  personalization: true,
};

const ALL_OFF: CookiePreferences = {
  analytics: false,
  targetedAdvertising: false,
  personalization: false,
};

const useCookieStore = create<CookieState>((set) => ({
  consentStatus: "pending",
  analytics: false,
  targetedAdvertising: false,
  personalization: false,
  preferencesOpen: false,

  hydrate: () => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!raw) return;
      const stored: CookieStoredValue = JSON.parse(raw);
      const VALID_STATUSES: ConsentStatus[] = [
        "pending",
        "accepted",
        "rejected",
      ];
      if (!VALID_STATUSES.includes(stored.status)) return;
      set({
        consentStatus: stored.status,
        analytics: stored.analytics ?? false,
        targetedAdvertising: stored.targetedAdvertising ?? false,
        personalization: stored.personalization ?? false,
      });
    } catch {
      // corrupt storage — leave as pending
    }
  },

  acceptAll: () => {
    persist("accepted", ALL_ON);
    set({ consentStatus: "accepted", ...ALL_ON });
  },

  rejectNonEssential: () => {
    persist("rejected", ALL_OFF);
    set({ consentStatus: "rejected", ...ALL_OFF });
  },

  openPreferences: () => set({ preferencesOpen: true }),

  closePreferences: () => set({ preferencesOpen: false }),

  savePreferences: (prefs: CookiePreferences) => {
    const anyEnabled =
      prefs.analytics || prefs.targetedAdvertising || prefs.personalization;
    const status: ConsentStatus = anyEnabled ? "accepted" : "rejected";
    persist(status, prefs);
    set({ consentStatus: status, ...prefs, preferencesOpen: false });
  },
}));

export default useCookieStore;
