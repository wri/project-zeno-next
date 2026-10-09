import { describe, expect, it } from "vitest";

import { parseAuthMe } from "../auth-me";

const ME = {
  id: "u-1",
  name: "Maria Silva",
  email: "maria@example.org",
  userType: "regular",
  hasProfile: false,
  preferredLanguageCode: "pt",
  promptsUsed: 3,
  promptQuota: 25,
  termsAccepted: true,
};

describe("parseAuthMe: fields that predate the front door", () => {
  it("maps a full response", () => {
    expect(parseAuthMe(ME)).toEqual({
      status: {
        email: "maria@example.org",
        id: "u-1",
        hasProfile: false,
        userType: "regular",
        preferredLanguageCode: "pt",
        name: "Maria Silva",
        termsAccepted: true,
      },
      usage: { used: 3, quota: 25 },
    });
  });

  it("treats a response without an email as not signed in", () => {
    expect(parseAuthMe({ ...ME, email: "" }).status).toBeNull();
    expect(parseAuthMe({ ...ME, email: undefined }).status).toBeNull();
    expect(parseAuthMe(null).status).toBeNull();
    expect(parseAuthMe("nope").status).toBeNull();
  });

  it("still reports quota when there is no email", () => {
    expect(parseAuthMe({ promptsUsed: 1, promptQuota: 5 }).usage).toEqual({
      used: 1,
      quota: 5,
    });
  });

  it("defaults a missing id to an empty string", () => {
    expect(parseAuthMe({ ...ME, id: undefined }).status?.id).toBe("");
  });

  it("coerces hasProfile to a boolean", () => {
    expect(parseAuthMe({ ...ME, hasProfile: 1 }).status?.hasProfile).toBe(true);
    expect(
      parseAuthMe({ ...ME, hasProfile: undefined }).status?.hasProfile
    ).toBe(false);
  });

  it("drops an unknown user type and a non-string language", () => {
    const { status } = parseAuthMe({
      ...ME,
      userType: "wizard",
      preferredLanguageCode: 7,
    });
    expect(status?.userType).toBeNull();
    expect(status?.preferredLanguageCode).toBeNull();
  });

  it("reports no usage without a numeric quota, and 0 used when used is missing", () => {
    expect(parseAuthMe({ ...ME, promptQuota: null }).usage).toBeNull();
    expect(parseAuthMe({ ...ME, promptQuota: "25" }).usage).toBeNull();
    expect(parseAuthMe({ ...ME, promptsUsed: null }).usage).toEqual({
      used: 0,
      quota: 25,
    });
  });
});

describe("parseAuthMe: terms and name (front door)", () => {
  it("reads the server's termsAccepted", () => {
    expect(parseAuthMe(ME).status?.termsAccepted).toBe(true);
    expect(
      parseAuthMe({ ...ME, termsAccepted: false }).status?.termsAccepted
    ).toBe(false);
  });

  it("reads an absent termsAccepted (a backend that predates it) as false", () => {
    const { termsAccepted, ...legacy } = ME;
    void termsAccepted;
    expect(parseAuthMe(legacy).status?.termsAccepted).toBe(false);
  });

  it("accepts only a literal true", () => {
    for (const value of ["true", 1, null, "2026-09-30T10:00:00Z"]) {
      expect(
        parseAuthMe({ ...ME, termsAccepted: value }).status?.termsAccepted
      ).toBe(false);
    }
  });

  it("ignores a wrongly typed name", () => {
    expect(
      parseAuthMe({ ...ME, name: { first: "Maria" } }).status?.name
    ).toBeNull();
  });

  it("parses the PATCH /api/auth/profile response (a user, no quota)", () => {
    const { promptsUsed, promptQuota, ...patched } = ME;
    void promptsUsed;
    void promptQuota;
    const parsed = parseAuthMe({ ...patched, hasProfile: true });
    expect(parsed.status).toMatchObject({
      hasProfile: true,
      termsAccepted: true,
    });
    expect(parsed.usage).toBeNull();
  });
});
