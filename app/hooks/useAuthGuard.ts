"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getToken } from "@/app/lib/api-client";
import useAuthStore from "@/app/store/authStore";

function getLoginUrl(redirectTo: string): string {
  const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;
  const url = new URL("https://api.resourcewatch.org/auth/login");
  url.searchParams.set("origin", "gnw");
  url.searchParams.set("callbackUrl", callbackUrl);
  url.searchParams.set("token", "true");
  return url.toString();
}

/**
 * Protects a page/layout behind authentication.
 * Waits for AuthBootstrapper to finish, then redirects to login if needed.
 * Returns true when the user is authenticated and the page is safe to render.
 */
export function useAuthGuard(): boolean {
  const { authLoaded, isAuthenticated, hasProfile } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoaded) return;

    if (!isAuthenticated) {
      if (!getToken()) {
        window.location.href = getLoginUrl(window.location.href);
      }
      return;
    }

    if (pathname.startsWith("/app") && !hasProfile) {
      window.location.href = `/onboarding${window.location.search}`;
    } else if (pathname.startsWith("/onboarding") && hasProfile) {
      window.location.href = "/app";
    }
  }, [authLoaded, isAuthenticated, hasProfile, pathname]);

  if (!authLoaded || !isAuthenticated) return false;

  const isApp = pathname.startsWith("/app");
  const isOnboarding = pathname.startsWith("/onboarding");
  if ((isApp && !hasProfile) || (isOnboarding && hasProfile)) return false;

  return true;
}
