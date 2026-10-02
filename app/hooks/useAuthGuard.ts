"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/app/lib/router";
import { getToken } from "@/app/lib/api-client";
import useAuthStore from "@/app/store/authStore";
import { API_CONFIG } from "@/app/config/api";
import { isFrontDoorEnabled } from "@/app/config/front-door";

/**
 * The Resource Watch login URL that returns to `redirectTo` through
 * /auth/callback on `origin` (this site by default).
 */
export function getLoginUrl(
  redirectTo: string,
  origin: string = window.location.origin
): string {
  const callbackUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;
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

/**
 * Where to send a signed-in person instead of this route. `hard` is a full
 * page load (every redirect the guard has always made); `client` is a router
 * navigation, used only for /welcome → /app so accepting the terms never
 * races a full reload.
 */
export interface AuthGuardRedirect {
  href: string;
  mode: "hard" | "client";
}

/**
 * The route rules for a signed-in person, as a pure function so both
 * branches can be pinned by tests. Returns null when the route may render.
 *
 * Always: /onboarding with a profile goes to /app.
 *
 * Flag off (unchanged): /app* needs a profile, else /onboarding with the
 * query string (so ?prompt= survives).
 *
 * Flag on (front door): /app* needs accepted terms, else /welcome with the
 * query string; /welcome with the terms accepted continues to /app with the
 * query string.
 */
export function authGuardDecision({
  pathname,
  search,
  hasProfile,
  termsAccepted,
  frontDoor,
}: AuthGuardInput): AuthGuardRedirect | null {
  const isApp = pathname.startsWith("/app");
  // The paths are disjoint, so this rule's place before the split is free.
  if (pathname.startsWith("/onboarding") && hasProfile) {
    return { href: "/app", mode: "hard" };
  }

  if (!frontDoor) {
    return isApp && !hasProfile
      ? { href: `/onboarding${search}`, mode: "hard" }
      : null;
  }

  const isWelcome = pathname === "/welcome" || pathname.startsWith("/welcome/");
  if (isApp && !termsAccepted)
    return { href: `/welcome${search}`, mode: "hard" };
  if (isWelcome && termsAccepted)
    return { href: `/app${search}`, mode: "client" };
  return null;
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

    const redirect = authGuardDecision({
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

  // Whether to render never depends on the query string.
  return (
    authGuardDecision({
      pathname,
      search: "",
      hasProfile,
      termsAccepted,
      frontDoor,
    }) === null
  );
}
