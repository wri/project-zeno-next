import { describe, expect, it } from "vitest";

import {
  authGuardDecision,
  getLoginUrl,
  type AuthGuardInput,
} from "../useAuthGuard";

const SEARCH =
  "?prompt=How+much+tree+cover+has+Par%C3%A1+lost%3F&utm_source=gfw";

const ROUTES = [
  "/app",
  "/app/threads/t-1",
  "/app/classic",
  "/onboarding",
  "/onboarding-debug",
  "/welcome",
  "/dashboard",
  "/dashboards",
  "/dashboards/d-1",
  "/manage-users",
  "",
];

function decide(input: Partial<AuthGuardInput>) {
  return authGuardDecision({
    pathname: "/app",
    search: SEARCH,
    hasProfile: false,
    termsAccepted: false,
    frontDoor: false,
    ...input,
  });
}

/**
 * useAuthGuard's rules before the front door, copied verbatim from the
 * effect and the render check (develop @ f559e6bd). With the flag off the
 * new decision must match this for every route and state.
 */
function legacyGuard(pathname: string, search: string, hasProfile: boolean) {
  let href: string | null = null;
  if (pathname.startsWith("/app") && !hasProfile) {
    href = `/onboarding${search}`;
  } else if (pathname.startsWith("/onboarding") && hasProfile) {
    href = "/app";
  }
  const isApp = pathname.startsWith("/app");
  const isOnboarding = pathname.startsWith("/onboarding");
  const allow = !((isApp && !hasProfile) || (isOnboarding && hasProfile));
  return { allow, href };
}

describe("authGuardDecision, flag off (must equal today's guard)", () => {
  const cases = ROUTES.flatMap((pathname) =>
    [SEARCH, "", "?ff=voice"].flatMap((search) =>
      [false, true].flatMap((hasProfile) =>
        [false, true].map((termsAccepted) => ({
          pathname,
          search,
          hasProfile,
          termsAccepted,
        }))
      )
    )
  );

  it.each(cases)(
    "$pathname$search profile=$hasProfile terms=$termsAccepted",
    ({ pathname, search, hasProfile, termsAccepted }) => {
      const decision = authGuardDecision({
        pathname,
        search,
        hasProfile,
        termsAccepted,
        frontDoor: false,
      });
      const legacy = legacyGuard(pathname, search, hasProfile);
      // null means "render this route".
      expect(decision === null).toBe(legacy.allow);
      expect(decision?.href ?? null).toBe(legacy.href);
      // Every flag-off redirect stays a full page load, as before.
      if (decision) expect(decision.mode).toBe("hard");
    }
  );

  it("sends /app without a profile to /onboarding with the query string intact", () => {
    expect(decide({ pathname: "/app" })).toEqual({
      href: `/onboarding${SEARCH}`,
      mode: "hard",
    });
  });

  it("sends /onboarding with a profile to a bare /app (unchanged)", () => {
    expect(decide({ pathname: "/onboarding", hasProfile: true })).toEqual({
      href: "/app",
      mode: "hard",
    });
  });

  it("ignores accepted terms", () => {
    expect(decide({ pathname: "/app", termsAccepted: true })).not.toBeNull();
  });

  it("does not gate /welcome (the page itself 404s with the flag off)", () => {
    expect(decide({ pathname: "/welcome", termsAccepted: true })).toEqual(null);
  });
});

describe("authGuardDecision, flag on (front door)", () => {
  const on = (input: Partial<AuthGuardInput>) =>
    decide({ frontDoor: true, ...input });

  it("sends /app* without accepted terms to /welcome with the query string intact", () => {
    for (const pathname of ["/app", "/app/threads/t-1", "/app/classic"]) {
      expect(on({ pathname })).toEqual({
        href: `/welcome${SEARCH}`,
        mode: "hard",
      });
    }
    expect(on({ pathname: "/app", search: "" })?.href).toBe("/welcome");
  });

  it("opens /app with accepted terms and no profile", () => {
    expect(on({ pathname: "/app", termsAccepted: true })).toEqual(null);
  });

  it("opens /app for a legacy profile (the server reports it as accepted)", () => {
    expect(
      on({ pathname: "/app", hasProfile: true, termsAccepted: true })
    ).toBeNull();
  });

  it("shows /welcome until the terms are accepted", () => {
    expect(on({ pathname: "/welcome" })).toEqual(null);
  });

  it("continues from /welcome to /app with the query string, client-side, once accepted", () => {
    expect(on({ pathname: "/welcome", termsAccepted: true })).toEqual({
      href: `/app${SEARCH}`,
      mode: "client",
    });
    expect(
      on({ pathname: "/welcome", termsAccepted: true, search: "" })
    ).toEqual({ href: "/app", mode: "client" });
  });

  it("never matches a path that merely starts with the letters of /welcome", () => {
    expect(on({ pathname: "/welcomes", termsAccepted: true })).toEqual(null);
  });

  it("keeps the /onboarding rule", () => {
    expect(on({ pathname: "/onboarding", hasProfile: true })).toEqual({
      href: "/app",
      mode: "hard",
    });
    expect(on({ pathname: "/onboarding" })).toBeNull();
  });

  it("leaves every other route open, as today (only /app* is gated)", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboards",
      "/dashboards/d-1",
      "/manage-users",
    ]) {
      expect(on({ pathname })).toEqual(null);
    }
  });
});

describe("getLoginUrl", () => {
  it("returns to the given URL through /auth/callback on the given origin", () => {
    const url = new URL(
      getLoginUrl("https://gnw.example/app?prompt=x", "https://gnw.example")
    );
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("origin")).toBe("gnw");
    expect(url.searchParams.get("token")).toBe("true");
    expect(url.searchParams.get("callbackUrl")).toBe(
      "https://gnw.example/auth/callback?redirect=" +
        encodeURIComponent("https://gnw.example/app?prompt=x")
    );
  });
});
