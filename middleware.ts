import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  TOKEN_NAME,
  getAuthTokenFromRequest,
} from "./app/api/shared/utils";

// Set a session token if not set.
// This is not to identify the user, but to identify the session.

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Handle logout centrally via middleware
  if (pathname === "/auth/logout") {
    // Best-effort: attempt RW logout via server-side GET with bearer token
    try {
      const token = getAuthTokenFromRequest(request);
      if (token) {
        await fetch("https://api.resourcewatch.org/auth/logout", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
      }
    } catch {}

    // Then clear our cookies and redirect locally to / (no external navigation)
    const response = NextResponse.redirect(new URL("/", origin));
    // Clear our cookies before redirecting
    response.cookies.set(TOKEN_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set("has_profile", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

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
    pathname.startsWith("/onboarding") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Guard restricted routes under /app
  if (pathname.startsWith("/app")) {
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

    // If authenticated, ensure profile is completed
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
      if (!data?.hasProfile) {
        const onboardingUrl = new URL("/onboarding", origin);
        return NextResponse.redirect(onboardingUrl);
      }
    } catch {
      const unauthorizedUrl = new URL("/unauthorized", origin);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}
