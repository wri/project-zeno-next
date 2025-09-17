import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, getAuthTokenFromRequest } from "./app/api/shared/utils";

// Set a session token if not set.
// This is not to identify the user, but to identify the session.

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Ensure session cookie exists for anonymous sessions
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (!sessionCookie) {
    const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const token = Array.from(
      { length: 64 },
      () => c[Math.floor(Math.random() * c.length)]
    ).join("");

    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, token, { maxAge: MAX_AGE });
    return response;
  }

  // Skip guards for API routes, static assets, callback, and onboarding
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // General guard for /app, /onboarding, and /dashboard
  const isOnboarding = pathname.startsWith("/onboarding");
  const isApp = pathname.startsWith("/app");
  const isDashboard = pathname.startsWith("/dashboard");

  if (isOnboarding || isApp || isDashboard) {
    const authCookie = getAuthTokenFromRequest(request);

    // If not authenticated, redirect to WRI login
    if (!authCookie) {
      const redirectUrl = `${origin}${pathname}${request.nextUrl.search}`;
      const callbackUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(
        redirectUrl
      )}`;
      const loginUrl = new URL("https://api.resourcewatch.org/auth/login");
      loginUrl.searchParams.set("origin", "gnw");
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      loginUrl.searchParams.set("token", "true");
      return NextResponse.redirect(loginUrl);
    }

    // Fetch profile once and route accordingly
    try {
      const meUrl = new URL("/api/auth/me", origin);
      const res = await fetch(meUrl, {
        headers: {
          cookie: request.headers.get("cookie") || "",
          "cache-control": "no-store",
        },
      });
      if (!res.ok) {
        const unauthorizedUrl = new URL("/unauthorized", origin);
        return NextResponse.redirect(unauthorizedUrl);
      }
      const data = await res.json();
      const hasProfile = Boolean(data?.hasProfile);

      if (isApp && !hasProfile) {
        const onboardingUrl = new URL("/onboarding", origin);
        onboardingUrl.search = request.nextUrl.search;
    
        return NextResponse.redirect(onboardingUrl);
      }
      if (isOnboarding && hasProfile) {
        const appUrl = new URL("/app", origin);
        return NextResponse.redirect(appUrl);
      }
    } catch {
      const unauthorizedUrl = new URL("/unauthorized", origin);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}
