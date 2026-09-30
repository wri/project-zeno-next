import { create } from "zustand";
import { API_CONFIG } from "@/app/config/api";
import { type UserType } from "@/app/schemas/api/admin/users/get";

interface AuthState {
  userId: string | null;
  userEmail: string | null;
  userType: UserType | null;
  // Onboarding language preference (ISO code, e.g. "pt"); used to default the
  // Web Speech API dictation language. Null until /api/auth/me resolves.
  preferredLanguageCode: string | null;
  isAuthenticated: boolean;
  hasProfile: boolean;
  // Resource Watch display name from /api/auth/me; the /welcome greeting.
  userName: string | null;
  // Stored terms acceptance (front door, /welcome). Null until accepted.
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  // Whether /app may open (front door). People who completed the old
  // onboarding form accepted the terms there, so a profile counts too.
  termsAccepted: boolean;
  authLoaded: boolean;
  usedPrompts: number;
  totalPrompts: number;
  isSignupOpen: boolean;
  isLoadingMetadata: boolean;
  setPromptUsage: (used: number, total: number) => void;
  setUsageFromHeaders: (headers: Headers | Record<string, string>) => void;
  setAuthStatus: (args: {
    email: string;
    id: string;
    hasProfile: boolean;
    userType: UserType | null;
    preferredLanguageCode?: string | null;
    name?: string | null;
    termsAcceptedAt?: string | null;
    termsVersion?: string | null;
  }) => void;
  // The person accepted `version` of the terms on /welcome just now.
  acceptTerms: (version: string) => void;
  // The profile was saved (in-chat card or settings); implies accepted terms.
  markProfileComplete: () => void;
  setAuthLoaded: () => void;
  clearAuth: () => void;
  fetchMetadata: () => Promise<void>;
}

const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  userEmail: null,
  userType: null,
  preferredLanguageCode: null,
  isAuthenticated: false,
  hasProfile: false,
  userName: null,
  termsAcceptedAt: null,
  termsVersion: null,
  termsAccepted: false,
  authLoaded: false,
  usedPrompts: 0,
  totalPrompts: 10,
  isSignupOpen: false,
  isLoadingMetadata: false,
  setPromptUsage: (used: number, total: number) => {
    set({ usedPrompts: used, totalPrompts: total });
  },
  setUsageFromHeaders: (headers: Headers | Record<string, string>) => {
    const getHeader = (name: string): string | null => {
      if (typeof Headers !== "undefined" && headers instanceof Headers) {
        // Case-insensitive get
        for (const [k, v] of (headers as Headers).entries()) {
          if (k.toLowerCase() === name.toLowerCase()) return v;
        }
        return null;
      } else {
        const rec = headers as Record<string, string>;
        const match = Object.keys(rec).find(
          (k) => k.toLowerCase() === name.toLowerCase()
        );
        return match ? rec[match] : null;
      }
    };

    const usedStr = getHeader("X-Prompts-Used");
    const quotaStr = getHeader("X-Prompts-Quota");
    const used = usedStr != null ? Number(usedStr) : null;
    const quota = quotaStr != null ? Number(quotaStr) : null;

    set(({ usedPrompts, totalPrompts }) => {
      const newUsed =
        typeof used === "number" && !Number.isNaN(used) ? used : usedPrompts;
      const newTotal =
        typeof quota === "number" && !Number.isNaN(quota)
          ? quota
          : totalPrompts;

      return {
        usedPrompts: newUsed,
        totalPrompts: newTotal,
      };
    });
  },
  setAuthStatus: ({
    email,
    id,
    hasProfile,
    userType,
    preferredLanguageCode = null,
    name = null,
    termsAcceptedAt = null,
    termsVersion = null,
  }) => {
    set({
      userId: id,
      userEmail: email,
      userType,
      preferredLanguageCode,
      isAuthenticated: true,
      hasProfile,
      userName: name,
      termsAcceptedAt,
      termsVersion,
      termsAccepted: termsAcceptedAt !== null || hasProfile,
      authLoaded: true,
    });
  },
  acceptTerms: (version: string) => {
    set({
      // Client clock until the next /api/auth/me reports the stored time.
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: version,
      termsAccepted: true,
    });
  },
  markProfileComplete: () => {
    set({ hasProfile: true, termsAccepted: true });
  },
  setAuthLoaded: () => {
    set({ authLoaded: true });
  },
  clearAuth: () => {
    set({
      userId: null,
      userEmail: null,
      userType: null,
      preferredLanguageCode: null,
      isAuthenticated: false,
      hasProfile: false,
      userName: null,
      termsAcceptedAt: null,
      termsVersion: null,
      termsAccepted: false,
      authLoaded: true,
    });
  },
  fetchMetadata: async () => {
    set({ isLoadingMetadata: true });
    try {
      if (!API_CONFIG.ENDPOINTS.METADATA) {
        throw new Error("API_METADATA_URL is not configured");
      }
      const response = await fetch(API_CONFIG.ENDPOINTS.METADATA);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      set({
        isSignupOpen: data.is_signup_open,
        isLoadingMetadata: false,
      });
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      set({
        isLoadingMetadata: false,
        isSignupOpen: false, // Keep default false on error
      });
    }
  },
}));

export default useAuthStore;
