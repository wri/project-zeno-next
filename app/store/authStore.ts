import { create } from "zustand";
import { API_CONFIG } from "@/app/config/api";

interface AuthState {
  userEmail: string | null;
  isAuthenticated: boolean;
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

const useAuthStore = create<AuthState>()((set) => ({
  userEmail: null,
  isAuthenticated: false,
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
      isAnonymous: true,
    });
  },
  setAuthStatus: (email) => {
    set({
      userEmail: email,
      isAuthenticated: true,
      isAnonymous: false,
    });
  },
  clearAuth: () => {
    set({
      userEmail: null,
      isAuthenticated: false,
      isAnonymous: false,
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
