import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_DRAFT,
  draftFromSuggestion,
  isProfileDraftComplete,
  profileCardMode,
  toProfilePatch,
  withSector,
  type ProfileCardOptions,
  type ProfileSuggestion,
} from "../profile-card";

const options: ProfileCardOptions = {
  sectors: { government: "Government", ngo: "NGO / Non-profit" },
  sector_roles: {
    government: { analyst: "Analyst", policy_maker: "Policy maker" },
    ngo: { field_officer: "Field officer" },
  },
  countries: { BRA: "Brazil", KEN: "Kenya" },
  languages: { en: "English", pt: "Português" },
};

const fullGfw: ProfileSuggestion = {
  source: "gfw",
  organisation: "State environment agency",
  sector: "government",
  role: "analyst",
  country: "BRA",
  language: "pt",
};

describe("isProfileDraftComplete", () => {
  it("requires sector and country, not role", () => {
    expect(isProfileDraftComplete(EMPTY_PROFILE_DRAFT)).toBe(false);
    expect(
      isProfileDraftComplete({ sector: "ngo", role: "", country: "" })
    ).toBe(false);
    expect(
      isProfileDraftComplete({ sector: "ngo", role: "", country: "KEN" })
    ).toBe(true);
  });
});

describe("withSector", () => {
  it("keeps a role that belongs to the new sector", () => {
    const draft = { sector: "government", role: "analyst", country: "" };
    expect(withSector(draft, "government", options).role).toBe("analyst");
  });

  it("clears a role that doesn't belong to the new sector", () => {
    const draft = { sector: "government", role: "analyst", country: "BRA" };
    expect(withSector(draft, "ngo", options)).toEqual({
      sector: "ngo",
      role: "",
      country: "BRA",
    });
  });
});

describe("draftFromSuggestion", () => {
  it("maps a full GFW profile onto the draft", () => {
    expect(draftFromSuggestion(fullGfw, options)).toEqual({
      sector: "government",
      role: "analyst",
      country: "BRA",
    });
  });

  it("drops codes the options don't know", () => {
    expect(
      draftFromSuggestion(
        { source: "gfw", sector: "retired_code", role: "x", country: "ZZZ" },
        options
      )
    ).toEqual(EMPTY_PROFILE_DRAFT);
  });

  it("drops a role from another sector", () => {
    expect(
      draftFromSuggestion(
        { source: "gfw", sector: "ngo", role: "analyst", country: "KEN" },
        options
      ).role
    ).toBe("");
  });

  it("returns an empty draft with no suggestion", () => {
    expect(draftFromSuggestion(undefined, options)).toEqual(
      EMPTY_PROFILE_DRAFT
    );
  });
});

describe("profileCardMode", () => {
  it("offers one-click confirmation for a full GFW profile", () => {
    expect(profileCardMode(fullGfw, options)).toBe("confirm");
  });

  it("falls back to fields for a thin GFW profile", () => {
    expect(
      profileCardMode({ source: "gfw", sector: "government" }, options)
    ).toBe("fields");
  });

  it("uses fields for a new person", () => {
    expect(profileCardMode(undefined, options)).toBe("fields");
  });
});

describe("toProfilePatch", () => {
  it("builds a partial update with no role", () => {
    expect(
      toProfilePatch({ sector: "ngo", role: "", country: "KEN" }, options)
    ).toEqual({
      sector_code: "ngo",
      role_code: null,
      country_code: "KEN",
      has_profile: true,
    });
  });

  it("carries organisation and a known language from the suggestion", () => {
    expect(
      toProfilePatch(draftFromSuggestion(fullGfw, options), options, fullGfw)
    ).toEqual({
      sector_code: "government",
      role_code: "analyst",
      country_code: "BRA",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      has_profile: true,
    });
  });

  it("leaves out a language the options don't know", () => {
    const patch = toProfilePatch(
      { sector: "ngo", role: "", country: "KEN" },
      options,
      { source: "gfw", language: "xx" }
    );
    expect(patch).not.toHaveProperty("preferred_language_code");
  });

  it("refuses an incomplete draft", () => {
    expect(() => toProfilePatch(EMPTY_PROFILE_DRAFT, options)).toThrow(
      /sector and country/
    );
  });
});
