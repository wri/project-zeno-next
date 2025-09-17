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

          console.log(token, REDIRECT_URL_KEY, window.opener);

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
        }
      } else {
        const error = params.get("error");
        console.warn(
          "No token in callback; redirecting to login flow via /app",
          { error }
        );
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
