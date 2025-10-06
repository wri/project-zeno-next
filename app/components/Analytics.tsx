"use client";

import { useEffect } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import useCookieConsentStore from "@/app/store/cookieConsentStore";

export default function Analytics() {
  const { cookieConsent, setConsentStatus } = useCookieConsentStore();
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  useEffect(() => {
    if (!gaId) return;
    try {
      const asked = localStorage.getItem("analyticsConsentAsked");
      const consent = localStorage.getItem("analyticsConsent");
      if (asked && consent === "true" && !cookieConsent) {
        setConsentStatus(true);
      }
    } catch {
      // ignore
    }
  }, [cookieConsent, gaId, setConsentStatus]);

  if (!gaId) return null;
  if (!cookieConsent) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
