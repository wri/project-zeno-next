"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  Link,
  Portal,
  Text,
  Center,
  Spinner,
  VStack,
} from "@chakra-ui/react";
import useAuthStore from "../store/authStore";

const wriAuthUrl = "https://api.resourcewatch.org/auth/login";
const REDIRECT_URL_KEY = "redirectUrl";

function AuthDialog({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={() => {}}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>{children}</Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function LoginOverlay() {
  const {
    isAuthenticated,
    userEmail,
    isWhitelisted,
    setAuthStatus,
    clearAuth,
  } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutPopup, setLogoutPopup] = useState<Window | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setAuthStatus(data.user.email);
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [setAuthStatus, clearAuth]);

  // Cleanup popup on component unmount
  useEffect(() => {
    return () => {
      if (logoutPopup && !logoutPopup.closed) {
        logoutPopup.close();
      }
    };
  }, [logoutPopup]);

  // Listen for messages from logout popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "LOGOUT_COMPLETE") {
        // Close popup when logout is complete
        if (logoutPopup && !logoutPopup.closed) {
          logoutPopup.close();
          setLogoutPopup(null);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [logoutPopup]);

  // Function to manually close the logout popup
  const closeLogoutPopup = () => {
    if (logoutPopup && !logoutPopup.closed) {
      logoutPopup.close();
      setLogoutPopup(null);
    }
  };

  const handleLoginClick = () => {
    localStorage.setItem(REDIRECT_URL_KEY, window.location.pathname);
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authUrl = `${wriAuthUrl}?callbackUrl=${encodeURIComponent(
      callbackUrl
    )}&token=true`;
    window.open(authUrl, "WRI Login", "width=600,height=700");
  };

  const handleLogoutClick = async () => {
    setIsLoggingOut(true); // Set logging out state immediately

    try {
      // Call our logout API to clear the server-side cookie
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // Clear local auth state
      clearAuth();

      // Create logout callback URL that will handle the return from ResourceWatch
      const logoutCallbackUrl = `${window.location.origin}/auth/logout-callback`;
      const resourceWatchLogoutUrl = `https://api.resourcewatch.org/auth/logout?callbackUrl=${encodeURIComponent(
        logoutCallbackUrl
      )}`;

      // Try to open in a popup window (with pop-under behavior)
      const popup = window.open(
        resourceWatchLogoutUrl,
        "WRI Logout",
        "width=600,height=700,scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no"
      );
      console.log("Popup:", popup);

      // Check if popup was blocked or failed to open
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        console.log("Popup blocked or failed, falling back to direct redirect");
        // Fallback: direct redirect if popup is blocked
        window.location.href = resourceWatchLogoutUrl;
      } else {
        // Store popup reference for manual closing
        setLogoutPopup(popup);

        // Popup opened successfully, reset loading state
        setIsLoggingOut(false);

        // Monitor popup to detect if it's manually closed
        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            setLogoutPopup(null);
          }
        }, 1000); // Check every second

        // Fallback: Auto-close popup after timeout (e.g., 10 seconds)
        setTimeout(() => {
          clearInterval(checkPopupClosed);
          if (popup && !popup.closed) {
            popup.close();
            setLogoutPopup(null);
          }
        }, 10000); // 10 seconds timeout
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if the API call fails, still clear local state
      clearAuth();
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <AuthDialog open>
        <Dialog.Body>
          <Center>
            <VStack>
              <Spinner />
              <Text>Checking authentication...</Text>
            </VStack>
          </Center>
        </Dialog.Body>
      </AuthDialog>
    );
  }

  if (isAuthenticated && isWhitelisted) {
    return null;
  }

  let dialogInnerContent;

  if (!isAuthenticated) {
    dialogInnerContent = (
      <>
        <Dialog.Header>
          <Dialog.Title>Login Required</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Text>
            Please log in with your WRI account to access NatureWATCH.
          </Text>
        </Dialog.Body>
        <Dialog.Footer>
          <Button colorScheme="blue" onClick={handleLoginClick}>
            Login with WRI
          </Button>
        </Dialog.Footer>
      </>
    );
  } else {
    dialogInnerContent = (
      <>
        <Dialog.Header>
          <Dialog.Title>Access Denied</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Text>
            Your email domain (
            <strong>{userEmail?.split("@")[1] || "N/A"}</strong>) is not
            currently whitelisted for access.
          </Text>
          <Text mt="4">
            If you believe this is an error, please contact the project
            administrators. Alternatively, you can request access to the beta
            program by filling out this short survey:{" "}
            <Link
              href=""
              target="_blank"
              rel="noopener noreferrer"
              color="blue.500"
            >
              Interest Form for Land & Carbon Lab&apos;s AI-driven Tools
            </Link>
            .
          </Text>
        </Dialog.Body>
        <Dialog.Footer>
          {logoutPopup && !logoutPopup.closed ? (
            <Button onClick={closeLogoutPopup} variant="outline">
              Cancel Logout
            </Button>
          ) : (
            <Button
              onClick={handleLogoutClick}
              loading={isLoggingOut}
              loadingText="Logging out..."
            >
              Logout & Try Again
            </Button>
          )}
        </Dialog.Footer>
      </>
    );
  }

  return <AuthDialog open>{dialogInnerContent}</AuthDialog>;
}

export default LoginOverlay;
