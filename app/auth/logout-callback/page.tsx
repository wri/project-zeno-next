"use client";

import { useEffect } from "react";
import { Center, Spinner, Text, VStack } from "@chakra-ui/react";

export default function LogoutCallbackPage() {
  useEffect(() => {
    const processLogout = async () => {
      try {
        // If this page was opened in a popup, communicate with the parent window
        if (window.opener) {
          // Send message to parent window that logout is complete
          window.opener.postMessage(
            { type: "LOGOUT_COMPLETE" },
            window.location.origin
          );

          // Tell the parent window to refresh/redirect to complete the logout
          window.opener.location.href = window.opener.location.origin;

          // Close this popup window
          setTimeout(() => window.close(), 500);
        } else {
          // Fallback: if not in a popup, redirect directly
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Logout callback failed:", error);
        // Fallback redirect
        window.location.href = "/";
      }
    };

    processLogout();
  }, []);

  return (
    <Center h="100vh">
      <VStack>
        <Spinner />
        <Text>Completing logout, please wait...</Text>
      </VStack>
    </Center>
  );
}
