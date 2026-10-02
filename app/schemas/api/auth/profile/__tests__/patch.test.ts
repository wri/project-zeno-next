import { describe, expect, it } from "vitest";

import {
  PatchProfilePartialRequestSchema,
  PatchProfileRequestSchema,
} from "../patch";

describe("PatchProfilePartialRequestSchema", () => {
  it("accepts the /welcome consent patch on its own", () => {
    expect(
      PatchProfilePartialRequestSchema.parse({ terms_version: "2026-09-30" })
    ).toEqual({ terms_version: "2026-09-30" });
  });

  it("accepts the profile card's patch", () => {
    const card = {
      sector_code: "government",
      role_code: null,
      country_code: "BR",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      has_profile: true,
    };
    expect(PatchProfilePartialRequestSchema.parse(card)).toEqual(card);
  });

  it("rejects a blank terms version", () => {
    expect(
      PatchProfilePartialRequestSchema.safeParse({ terms_version: "" }).success
    ).toBe(false);
  });

  it("still rejects a blank name when one is sent", () => {
    expect(
      PatchProfilePartialRequestSchema.safeParse({ first_name: "" }).success
    ).toBe(false);
  });

  it("drops keys the backend doesn't know", () => {
    expect(
      PatchProfilePartialRequestSchema.parse({
        terms_version: "2026-09-30",
        surprise: true,
      })
    ).toEqual({ terms_version: "2026-09-30" });
  });
});

describe("PatchProfileRequestSchema (the full onboarding form) is not loosened", () => {
  it("still requires names and has_profile", () => {
    expect(PatchProfileRequestSchema.safeParse({}).success).toBe(false);
    expect(
      PatchProfileRequestSchema.safeParse({ sector_code: "government" }).success
    ).toBe(false);
    expect(
      PatchProfileRequestSchema.safeParse({
        first_name: "Maria",
        last_name: "Silva",
        has_profile: true,
      }).success
    ).toBe(true);
  });

  it("does not know terms_version", () => {
    expect(
      PatchProfileRequestSchema.parse({
        first_name: "Maria",
        last_name: "Silva",
        has_profile: true,
        terms_version: "2026-09-30",
      })
    ).not.toHaveProperty("terms_version");
  });
});
