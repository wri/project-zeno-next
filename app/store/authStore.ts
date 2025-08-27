import { create } from "zustand";

interface AuthState {
  userEmail: string | null;
  isAuthenticated: boolean;
  isWhitelisted: boolean;
  isAnonymous: boolean;
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
