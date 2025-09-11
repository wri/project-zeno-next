import { create } from "zustand";

interface ConsentState {
  cookieConsent: boolean;
  askedBefore: boolean;
  setConsentStatus: (value: boolean) => void;
}

const useCookieConsentStore = create<ConsentState>()((set) => ({
  cookieConsent: false,
  askedBefore: false,
  setConsentStatus: (value) => {
    set({
      cookieConsent: value,
      askedBefore: true
    });
  },
}));

export default useCookieConsentStore;
