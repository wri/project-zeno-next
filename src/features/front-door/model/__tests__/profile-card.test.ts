import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_DRAFT,
  draftFromSuggestion,
  isProfileDraftComplete,
  profileCardMode,
  toProfilePatch,
  withSector,
  type ProfileCardOptions,
  type ProfileDraft,
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
  company_organization: "State environment agency",
  sector_code: "government",
  role_code: "analyst",
  country_code: "BRA",
  preferred_language_code: "pt",
};

function draft(fields: Partial<ProfileDraft>): ProfileDraft {
  return { ...EMPTY_PROFILE_DRAFT, ...fields };
}

describe("EMPTY_PROFILE_DRAFT", () => {
  it("has the card's four fields in the order it asks for them", () => {
    expect(Object.keys(EMPTY_PROFILE_DRAFT)).toEqual([
      "country",
      "language",
      "sector",
      "role",
    ]);
    expect(Object.values(EMPTY_PROFILE_DRAFT)).toEqual(["", "", "", ""]);
  });
});

describe("isProfileDraftComplete", () => {
  it("requires sector and country, not role or language", () => {
    expect(isProfileDraftComplete(EMPTY_PROFILE_DRAFT)).toBe(false);
    expect(isProfileDraftComplete(draft({ sector: "ngo" }))).toBe(false);
    expect(
      isProfileDraftComplete(draft({ language: "pt", country: "KEN" }))
    ).toBe(false);
    expect(
      isProfileDraftComplete(draft({ sector: "ngo", country: "KEN" }))
    ).toBe(true);
  });
});

describe("withSector", () => {
  it("keeps a role that belongs to the new sector", () => {
    const current = draft({ sector: "government", role: "analyst" });
    expect(withSector(current, "government", options).role).toBe("analyst");
  });

  it("clears a role that doesn't belong to the new sector, keeping the rest", () => {
    const current = draft({
      country: "BRA",
      language: "pt",
      sector: "government",
      role: "analyst",
    });
    expect(withSector(current, "ngo", options)).toEqual({
      country: "BRA",
      language: "pt",
      sector: "ngo",
      role: "",
    });
  });
});

describe("draftFromSuggestion", () => {
  it("maps a full GFW profile onto the draft, language included", () => {
    expect(draftFromSuggestion(fullGfw, options)).toEqual({
      country: "BRA",
      language: "pt",
      sector: "government",
      role: "analyst",
    });
  });

  it("drops codes the options don't know, language included", () => {
    expect(
      draftFromSuggestion(
        {
          sector_code: "retired_code",
          role_code: "x",
          country_code: "ZZZ",
          preferred_language_code: "xx",
        },
        options
      )
    ).toEqual(EMPTY_PROFILE_DRAFT);
  });

  it("drops a role from another sector", () => {
    expect(
      draftFromSuggestion(
        { sector_code: "ngo", role_code: "analyst", country_code: "KEN" },
        options
      ).role
    ).toBe("");
  });

  it("leaves language empty when the suggestion has none", () => {
    expect(draftFromSuggestion({ country_code: "KEN" }, options).language).toBe(
      ""
    );
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

  it("doesn't need a language to offer confirmation", () => {
    const { preferred_language_code, ...noLanguage } = fullGfw;
    void preferred_language_code;
    expect(profileCardMode(noLanguage, options)).toBe("confirm");
  });

  it("falls back to fields for a thin GFW profile", () => {
    expect(profileCardMode({ sector_code: "government" }, options)).toBe(
      "fields"
    );
  });

  it("uses fields for a new person", () => {
    expect(profileCardMode(undefined, options)).toBe("fields");
  });
});

describe("toProfilePatch", () => {
  it("builds a partial update with no role and no language", () => {
    expect(toProfilePatch(draft({ sector: "ngo", country: "KEN" }))).toEqual({
      sector_code: "ngo",
      role_code: null,
      country_code: "KEN",
      has_profile: true,
    });
  });

  it("sends the draft's language", () => {
    expect(
      toProfilePatch(draft({ sector: "ngo", country: "KEN", language: "en" }))
    ).toEqual({
      sector_code: "ngo",
      role_code: null,
      country_code: "KEN",
      preferred_language_code: "en",
      has_profile: true,
    });
  });

  it("carries the organisation from the suggestion and everything else from the draft", () => {
    expect(
      toProfilePatch(draftFromSuggestion(fullGfw, options), fullGfw)
    ).toEqual({
      sector_code: "government",
      role_code: "analyst",
      country_code: "BRA",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      has_profile: true,
    });
  });

  it("uses the language the person chose over the suggestion's", () => {
    const edited = { ...draftFromSuggestion(fullGfw, options), language: "en" };
    expect(toProfilePatch(edited, fullGfw).preferred_language_code).toBe("en");
  });

  it("omits the language when the person cleared it, even if GFW had one", () => {
    const cleared = { ...draftFromSuggestion(fullGfw, options), language: "" };
    expect(toProfilePatch(cleared, fullGfw)).not.toHaveProperty(
      "preferred_language_code"
    );
  });

  it("refuses an incomplete draft", () => {
    expect(() => toProfilePatch(EMPTY_PROFILE_DRAFT)).toThrow(
      /sector and country/
    );
  });
});
