"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/app/lib/router";
import { getToken } from "@/app/lib/api-client";
import useAuthStore from "@/app/store/authStore";
import { API_CONFIG } from "@/app/config/api";
import { isFrontDoorEnabled } from "@/app/config/front-door";
// Not the slice barrel: it exports WelcomePage, which uses this hook, and
// the cycle would be fragile. continue-url has no imports of its own.
import { continueUrl } from "@/src/features/front-door/lib/continue-url";

function getLoginUrl(redirectTo: string): string {
  const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;
  const url = new URL(`${API_CONFIG.RW_API_HOST}/auth/login`);
  url.searchParams.set("origin", "gnw");
  url.searchParams.set("callbackUrl", callbackUrl);
  url.searchParams.set("token", "true");
  return url.toString();
}

export interface AuthGuardInput {
  pathname: string;
  /** `window.location.search`, including the leading "?" (or ""). */
  search: string;
  hasProfile: boolean;
  termsAccepted: boolean;
  /** `isFrontDoorEnabled()`. */
  frontDoor: boolean;
}

export interface AuthGuardDecision {
  /** Whether a signed-in person may see this route now. */
  allow: boolean;
  /**
   * Where to send them instead. `hard` is a full page load (every redirect
   * the guard has always made); `client` is a router navigation, used only
   * for /welcome → /app so accepting the terms never races a full reload.
   */
  redirect: { href: string; mode: "hard" | "client" } | null;
}

const ALLOW: AuthGuardDecision = { allow: true, redirect: null };

function hard(href: string): AuthGuardDecision {
  return { allow: false, redirect: { href, mode: "hard" } };
}

/**
 * The route rules for a signed-in person, as a pure function so both
 * branches can be pinned by tests.
 *
 * Flag off (unchanged): /app* needs a profile, else /onboarding with the
 * query string (so ?prompt= survives); /onboarding with a profile goes to
 * /app.
 *
 * Flag on (front door): /app* needs accepted terms, else /welcome with the
 * query string; /welcome with the terms accepted continues to /app with the
 * query string; /onboarding with a profile still goes to /app.
 */
export function authGuardDecision({
  pathname,
  search,
  hasProfile,
  termsAccepted,
  frontDoor,
}: AuthGuardInput): AuthGuardDecision {
  const isApp = pathname.startsWith("/app");
  const isOnboarding = pathname.startsWith("/onboarding");

  if (!frontDoor) {
    if (isApp && !hasProfile) return hard(`/onboarding${search}`);
    if (isOnboarding && hasProfile) return hard("/app");
    return ALLOW;
  }

  const isWelcome = pathname === "/welcome" || pathname.startsWith("/welcome/");
  if (isApp && !termsAccepted) return hard(`/welcome${search}`);
  if (isWelcome && termsAccepted) {
    return {
      allow: false,
      redirect: { href: continueUrl(search), mode: "client" },
    };
  }
  if (isOnboarding && hasProfile) return hard("/app");
  return ALLOW;
}

/**
 * Protects a page/layout behind authentication.
 * Waits for AuthBootstrapper to finish, then redirects to login if needed.
 * Returns true when the user is authenticated and the page is safe to render.
 */
export function useAuthGuard(): boolean {
  const { authLoaded, isAuthenticated, hasProfile, termsAccepted } =
    useAuthStore();
  // usePathname() is typed `string | null`; treat null as "" (matches no route).
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const frontDoor = isFrontDoorEnabled();

  useEffect(() => {
    if (!authLoaded) return;

    if (!isAuthenticated) {
      if (!getToken()) {
        window.location.href = getLoginUrl(window.location.href);
      }
      return;
    }

    const { redirect } = authGuardDecision({
      pathname,
      search: window.location.search,
      hasProfile,
      termsAccepted,
      frontDoor,
    });
    if (!redirect) return;
    if (redirect.mode === "client") {
      router.replace(redirect.href);
    } else {
      window.location.href = redirect.href;
    }
  }, [
    authLoaded,
    isAuthenticated,
    hasProfile,
    termsAccepted,
    pathname,
    router,
    frontDoor,
  ]);

  if (!authLoaded || !isAuthenticated) return false;

  // `allow` never depends on the query string.
  return authGuardDecision({
    pathname,
    search: "",
    hasProfile,
    termsAccepted,
    frontDoor,
  }).allow;
}
