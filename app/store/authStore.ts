import { create } from "zustand";

interface AuthState {
  userEmail: string | null;
  isAuthenticated: boolean;
  isWhitelisted: boolean;
  isAnonymous: boolean;
  usedPrompts: number;
  totalPrompts: number;
  isSignupOpen: boolean;
  isLoadingMetadata: boolean;
  setPromptUsage: (used: number, total: number) => void;
  setUsageFromHeaders: (headers: Headers | Record<string, string>) => void;
  setAuthStatus: (email: string) => void;
  setAnonymous: () => void;
  clearAuth: () => void;
  fetchMetadata: () => Promise<void>;
}

const ALLOWED_DOMAINS = ["wri.org", "developmentseed.org", "wriconsultant.org"];

const API_METADATA_URL = process.env.NEXT_PUBLIC_API_METADATA_URL;

const useAuthStore = create<AuthState>()((set) => ({
  userEmail: null,
  isAuthenticated: false,
  isWhitelisted: false,
  isAnonymous: false,
  usedPrompts: 0,
  totalPrompts: 25,
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

    set(({ usedPrompts, totalPrompts }) => ({
      usedPrompts:
        typeof used === "number" && !Number.isNaN(used) ? used : usedPrompts,
      totalPrompts:
        typeof quota === "number" && !Number.isNaN(quota)
          ? quota
          : totalPrompts,
    }));
  },
  setAnonymous: () => {
    set({
      userEmail: null,
      isAuthenticated: false,
      isWhitelisted: false,
      isAnonymous: true,
    });
  },
  setAuthStatus: (email) => {
    const domain = email.split("@")[1];
    const isWhitelisted = ALLOWED_DOMAINS.includes(domain);
    set({
      userEmail: email,
      isAuthenticated: true,
      isWhitelisted,
      isAnonymous: false,
    });
  },
  clearAuth: () => {
    set({
      userEmail: null,
      isAuthenticated: false,
      isWhitelisted: false,
      isAnonymous: false,
    });
  },
  fetchMetadata: async () => {
    set({ isLoadingMetadata: true });
    try {
      if (!API_METADATA_URL) {
        throw new Error("API_METADATA_URL is not configured");
      }
      const response = await fetch(API_METADATA_URL);
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
