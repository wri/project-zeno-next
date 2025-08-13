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

  const handleLoginClick = () => {
    localStorage.setItem(REDIRECT_URL_KEY, window.location.pathname);
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authUrl = `${wriAuthUrl}?callbackUrl=${encodeURIComponent(
      callbackUrl
    )}&token=true`;
    window.open(authUrl, "WRI Login", "width=600,height=700");
  };

  const handleLogoutClick = () => {
    // This will need to be updated to call a logout API route
    // that clears the cookie. For now, just clear local state.
    clearAuth();
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
            Please log in with your WRI account to access Global Nature Watch.
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
          <Button onClick={handleLogoutClick}>Logout & Try Again</Button>
        </Dialog.Footer>
      </>
    );
  }

  return <AuthDialog open>{dialogInnerContent}</AuthDialog>;
}

export default LoginOverlay;
