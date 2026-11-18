import { describe, expect, it } from "vitest";

import {
  authGuardDecision,
  getLoginUrl,
  type AuthGuardInput,
} from "../useAuthGuard";

const SEARCH =
  "?prompt=How+much+tree+cover+has+Par%C3%A1+lost%3F&utm_source=gfw";

function decide(input: Partial<AuthGuardInput>) {
  return authGuardDecision({
    pathname: "/app",
    search: SEARCH,
    termsAccepted: false,
    ...input,
  });
}

describe("authGuardDecision", () => {
  it("sends /app* without accepted terms to /welcome with the query string intact", () => {
    for (const pathname of ["/app", "/app/threads/t-1", "/app/classic"]) {
      expect(decide({ pathname })).toEqual({
        href: `/welcome${SEARCH}`,
        mode: "hard",
      });
    }
    expect(decide({ pathname: "/app", search: "" })?.href).toBe("/welcome");
  });

  it("opens /app with accepted terms and no profile", () => {
    expect(decide({ pathname: "/app", termsAccepted: true })).toEqual(null);
  });

  it("shows /welcome until the terms are accepted", () => {
    expect(decide({ pathname: "/welcome" })).toEqual(null);
  });

  it("continues from /welcome to /app with the query string, client-side, once accepted", () => {
    expect(decide({ pathname: "/welcome", termsAccepted: true })).toEqual({
      href: `/app${SEARCH}`,
      mode: "client",
    });
    expect(
      decide({ pathname: "/welcome", termsAccepted: true, search: "" })
    ).toEqual({ href: "/app", mode: "client" });
  });

  it("never matches a path that merely starts with the letters of /welcome", () => {
    expect(decide({ pathname: "/welcomes", termsAccepted: true })).toEqual(
      null
    );
  });

  it("leaves every other route open, as today (only /app* is gated)", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboards",
      "/dashboards/d-1",
      "/manage-users",
    ]) {
      expect(decide({ pathname })).toEqual(null);
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
