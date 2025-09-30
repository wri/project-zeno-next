"use client";

import { useEffect } from "react";
import { Center, Spinner, Text, VStack } from "@chakra-ui/react";
import { sendGAEvent } from "@next/third-parties/google";
import useCookieConsentStore from "@/app/store/cookieConsentStore";

const REDIRECT_URL_KEY = "redirectUrl";

export default function AuthCallbackPage() {
  const { cookieConsent } = useCookieConsentStore();

  useEffect(() => {
    const processAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        try {
          await fetch("/api/auth/set-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          });

          // Clear any previous loop guard on successful auth
          sessionStorage.removeItem("authCallbackRedirects");

          const redirectQuery = params.get("redirect");
          const redirectUrl =
            redirectQuery || localStorage.getItem(REDIRECT_URL_KEY) || "/";
          if (window.opener) {
            window.opener.location.href = redirectUrl;
            localStorage.removeItem(REDIRECT_URL_KEY);
          } else {
            // Fallback for cases where opener is not available
            window.location.href = redirectUrl;
          }

          if (cookieConsent) {
            sendGAEvent("event", "user_logged_in", {
              value: crypto.randomUUID(),
            });
          }
          if (window.opener) {
            setTimeout(() => window.close(), 500);
          }
        } catch (error) {
          console.error("Failed to set auth token:", error);
          // Fallback: attempt to trigger login flow once, then break loop
          const redirects = Number(
            sessionStorage.getItem("authCallbackRedirects") || "0"
          );
          if (redirects >= 1) {
            window.location.href = "/";
            return;
          }
          sessionStorage.setItem(
            "authCallbackRedirects",
            String(redirects + 1)
          );
          const fallbackUrl = "/app";
          if (window.opener) {
            window.opener.location.href = fallbackUrl;
            setTimeout(() => window.close(), 500);
          } else {
            window.location.href = fallbackUrl;
          }
        }
      } else {
        const error = params.get("error");
        console.warn(
          "No token in callback; redirecting to login flow via /app",
          { error }
        );
        // Loop guard: only redirect to /app once from callback
        const redirects = Number(
          sessionStorage.getItem("authCallbackRedirects") || "0"
        );
        if (redirects >= 1) {
          window.location.href = "/";
          return;
        }
        sessionStorage.setItem("authCallbackRedirects", String(redirects + 1));
        const redirectUrl = "/app";
        if (window.opener) {
          window.opener.location.href = redirectUrl;
          localStorage.removeItem(REDIRECT_URL_KEY);
          setTimeout(() => window.close(), 500);
        } else {
          window.location.href = redirectUrl;
        }
      }
    };

    processAuth();
  }, []);

  return (
    <Center h="100vh">
      <VStack>
        <Spinner />
        <Text>Authenticating, please wait...</Text>
      </VStack>
    </Center>
  );
}
