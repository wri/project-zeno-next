import { create } from "zustand";

interface AuthState {
  userEmail: string | null;
  isAuthenticated: boolean;
  isWhitelisted: boolean;
  setAuthStatus: (email: string) => void;
  clearAuth: () => void;
}

const ALLOWED_DOMAINS = ["wri.org", "developmentseed.org", "wriconsultant.org"];

const useAuthStore = create<AuthState>()((set) => ({
  userEmail: null,
  isAuthenticated: false,
  isWhitelisted: false,
  setAuthStatus: (email) => {
    const domain = email.split("@")[1];
    const isWhitelisted = ALLOWED_DOMAINS.includes(domain);
    set({
      userEmail: email,
      isAuthenticated: true,
      isWhitelisted,
    });
  },
  clearAuth: () => {
    set({
      userEmail: null,
      isAuthenticated: false,
      isWhitelisted: false,
    });
  },
}));

export default useAuthStore;
