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
  IconButton,
} from "@chakra-ui/react";
import useAuthStore from "../store/authStore";
import { InfoIcon, XIcon } from "@phosphor-icons/react";
import theme from "../theme";

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
    <Dialog.Root open={open} placement="bottom">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner justifyContent="right">
          <Dialog.Content margin="2rem">{children}</Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function LoginOverlay(props: { isClassicMode?: boolean }) {
  const { isClassicMode } = props;

  const {
    isAuthenticated,
    userEmail,
    isWhitelisted,
    isAnonymous,
    setAnonymous,
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
        <DialogHeader title="Checking authentication" />
        <Dialog.Body>
          <Center gap={4}>
            <Spinner />
            <Text>Please wait a second...</Text>
          </Center>
        </Dialog.Body>
      </AuthDialog>
    );
  }

  if ((isAuthenticated && isWhitelisted) || isAnonymous) {
    // After checking login status if in classic mode, show a information dialog
    return isClassicMode ? <InfoDialog /> : null;
  }

  if (!isAuthenticated) {
    return (
      <AuthDialog open>
        <DialogHeader onCloseClick={setAnonymous} />
        <Dialog.Body display="flex" gap={2} flexDirection="column">
          <Text fontWeight="bold">
            You’re exploring Global Nature Watch as a guest.
          </Text>
          <Text>
            Guests have a limit of 5 prompts in a temporary conversation.
            <br /> Log in or sign up for free to unlock extra daily prompts and
            save multiple conversations.
          </Text>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={setAnonymous}>
            Dismiss
          </Button>
          <Button colorPalette="primary" onClick={handleLoginClick}>
            Login / Sign Up
          </Button>
        </Dialog.Footer>
      </AuthDialog>
    );
  }

  return (
    <AuthDialog open>
      <DialogHeader title="Access Denied" onCloseClick={setAnonymous} />
      <Dialog.Body>
        <Text>
          Your email domain (
          <strong>{userEmail?.split("@")[1] || "N/A"}</strong>) is not currently
          whitelisted for access.
        </Text>
        <Text mt="4">
          If you believe this is an error, please contact the project
          administrators. Alternatively, you can request access to the beta
          program by filling out this short survey:{" "}
          <Link
            href=""
            target="_blank"
            rel="noopener noreferrer"
            color="primary.500"
          >
            Interest Form for Land & Carbon Lab&apos;s AI-driven Tools
          </Link>
          .
        </Text>
      </Dialog.Body>
      <Dialog.Footer>
        <Button onClick={handleLogoutClick}>Logout & Try Again</Button>
      </Dialog.Footer>
    </AuthDialog>
  );
}

export default LoginOverlay;

function DialogHeader(props: { onCloseClick?: () => void; title?: string }) {
  const { onCloseClick, title = "Welcome" } = props;

  return (
    <Dialog.Header display="flex">
      <Dialog.Title mb={0} display="flex" gap={2} alignItems="center">
        <Center bg="cyan.100" borderRadius="full" w={8} h={8}>
          <InfoIcon weight="fill" color={theme.token("colors.cyan.600")} />
        </Center>
        {title}
      </Dialog.Title>
      {onCloseClick && (
        <IconButton
          variant="ghost"
          size="xs"
          aria-label="Close"
          onClick={onCloseClick}
          ml="auto"
        >
          <XIcon />
        </IconButton>
      )}
    </Dialog.Header>
  );
}

function InfoDialog() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog.Root open={open} placement="bottom" size="sm">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner justifyContent="right">
          <Dialog.Content margin={4}>
            <DialogHeader onCloseClick={() => setOpen(false)} />
            <Dialog.Body display="flex" gap={2} flexDirection="column">
              <Text fontWeight="bold">
                You&apos;re exploring in Classic Mode.
              </Text>
              <Text>
                You can continue browsing Global Nature Watch data layers, but
                AI features will be unavailable.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorPalette="primary"
                size="sm"
                onClick={() => setOpen(false)}
              >
                I understand
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
