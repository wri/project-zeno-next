import { create } from "zustand";

interface AuthState {
  userEmail: string | null;
  isAuthenticated: boolean;
  isWhitelisted: boolean;
  isAnonymous: boolean;
  usedPrompts: number;
  totalPrompts: number;
  setPromptUsage: (used: number, total: number) => void;
  setUsageFromHeaders: (headers: Headers | Record<string, string>) => void;
  setAuthStatus: (email: string) => void;
  setAnonymous: () => void;
  clearAuth: () => void;
}

const ALLOWED_DOMAINS = ["wri.org", "developmentseed.org", "wriconsultant.org"];

const useAuthStore = create<AuthState>()((set) => ({
  userEmail: null,
  isAuthenticated: false,
  isWhitelisted: false,
  isAnonymous: false,
  usedPrompts: 0,
  totalPrompts: 25,
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

    if (typeof used === "number" && !Number.isNaN(used)) {
      if (typeof quota === "number" && !Number.isNaN(quota)) {
        set({ usedPrompts: used, totalPrompts: quota });
      } else {
        set({ usedPrompts: used });
      }
    } else if (typeof quota === "number" && !Number.isNaN(quota)) {
      set({ totalPrompts: quota });
    }
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
}));

export default useAuthStore;
