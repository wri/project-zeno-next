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
  termsAcceptedAt: "2026-09-30T10:00:00Z",
  termsVersion: "2026-09-30",
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
        termsAcceptedAt: "2026-09-30T10:00:00Z",
        termsVersion: "2026-09-30",
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
  it("reads null terms for someone who hasn't accepted yet", () => {
    const { status } = parseAuthMe({
      ...ME,
      termsAcceptedAt: null,
      termsVersion: null,
    });
    expect(status?.termsAcceptedAt).toBeNull();
    expect(status?.termsVersion).toBeNull();
  });

  it("reads absent terms fields (a backend that predates them) as null", () => {
    const { termsAcceptedAt, termsVersion, ...legacy } = ME;
    void termsAcceptedAt;
    void termsVersion;
    const { status } = parseAuthMe(legacy);
    expect(status?.termsAcceptedAt).toBeNull();
    expect(status?.termsVersion).toBeNull();
  });

  it("ignores wrongly typed terms and name values", () => {
    const { status } = parseAuthMe({
      ...ME,
      termsAcceptedAt: 1727690400,
      termsVersion: true,
      name: { first: "Maria" },
    });
    expect(status?.termsAcceptedAt).toBeNull();
    expect(status?.termsVersion).toBeNull();
    expect(status?.name).toBeNull();
  });
});
