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

      console.log(token, REDIRECT_URL_KEY, window.opener);

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
        console.error("Authentication failed:", error);
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
