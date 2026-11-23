import { describe, expect, it } from "vitest";
import type { UserModel } from "@/app/schemas/api/admin/users/get";
import { toManagedUser } from "../managed-user";

const wire = (overrides: Partial<UserModel> = {}): UserModel => ({
  id: "u1",
  email: "ana@example.org",
  userType: "regular",
  ...overrides,
});

describe("toManagedUser", () => {
  it("settles every absent field", () => {
    const user = wire();
    expect(toManagedUser(user)).toEqual({
      id: "u1",
      email: "ana@example.org",
      name: null,
      organization: null,
      countryCode: null,
      sectorCode: null,
      languageCode: null,
      hasProfile: false,
      userType: "regular",
      audience: "external",
      joinedOn: null,
      signupSource: "unknown",
      wire: user,
    });
  });

  it("carries the profile fields", () => {
    expect(
      toManagedUser(
        wire({
          name: "Ana Lima",
          companyOrganization: "Conservation trust",
          countryCode: "BRA",
          sectorCode: "ngo",
          preferredLanguageCode: "pt",
          hasProfile: true,
        })
      )
    ).toMatchObject({
      name: "Ana Lima",
      organization: "Conservation trust",
      countryCode: "BRA",
      sectorCode: "ngo",
      languageCode: "pt",
      hasProfile: true,
    });
  });

  it.each([
    ["ana@wri.org", "internal"],
    ["ana@WRI.ORG", "internal"],
    ["ana@wriconsultant.org", "internal"],
    ["ana@developmentseed.org", "internal"],
    ["ana@india.wri.org", "internal"],
    ["ana@notwri.org", "external"],
    ["ana@wri.org.evil.com", "external"],
    ["ana@gmail.com", "external"],
    ["", "external"],
  ] as const)("audience of %s is %s", (email, audience) => {
    expect(toManagedUser(wire({ email })).audience).toBe(audience);
  });

  it.each<[UserModel["rwApps"], string]>([
    [undefined, "unknown"],
    [null, "unknown"],
    [[], "unknown"],
    [["gfw"], "gfw"],
    [["gnw", "gfw"], "gfw"],
    [["gnw"], "horizon"],
    [["rw", "gnw"], "horizon"],
    [["rw"], "other"],
    [["prep", "rw"], "other"],
  ])("signup source of RW apps %j is %s", (rwApps, signupSource) => {
    expect(toManagedUser(wire({ rwApps })).signupSource).toBe(signupSource);
  });

  it.each<[UserModel["firstSeenAt"], string | null]>([
    [undefined, null],
    [null, null],
    ["2026-11-05T10:20:30.123456Z", "2026-11-05"],
    ["2026-11-05T10:20:30+00:00", "2026-11-05"],
    ["2026-11-05T23:30:00-05:00", "2026-11-06"],
    ["2026-11-06T01:00:00+02:00", "2026-11-05"],
  ])("joined on the UTC day of %s", (firstSeenAt, joinedOn) => {
    expect(toManagedUser(wire({ firstSeenAt })).joinedOn).toBe(joinedOn);
  });
});
