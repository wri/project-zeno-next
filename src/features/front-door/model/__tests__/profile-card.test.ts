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
  topics: { fires: "Fires", water: "Water" },
};

const fullGfw: ProfileSuggestion = {
  company_organization: "State environment agency",
  sector_code: "government",
  role_code: "analyst",
  country_code: "BRA",
  preferred_language_code: "pt",
  topics: ["fires", "retired_topic"],
};

function draft(fields: Partial<ProfileDraft>): ProfileDraft {
  return { ...EMPTY_PROFILE_DRAFT, ...fields };
}

const REQUIRED = {
  sector: "ngo",
  country: "KEN",
  organisation: "Kenya Forest Service",
};

describe("isProfileDraftComplete", () => {
  it("requires sector, country and organisation, not role or language", () => {
    const complete = (d: Partial<ProfileDraft>) =>
      isProfileDraftComplete(draft(d), options);
    expect(complete({})).toBe(false);
    expect(complete({ sector: "ngo", country: "KEN" })).toBe(false);
    expect(complete({ ...REQUIRED, organisation: "   " })).toBe(false);
    expect(complete(REQUIRED)).toBe(true);
  });

  it("requires names and a topic once the person opts in to emails", () => {
    const optedIn = draft({ ...REQUIRED, receiveNewsEmails: true });
    expect(isProfileDraftComplete(optedIn, options)).toBe(false);
    const named = { ...optedIn, firstName: "Amina", lastName: "Otieno" };
    expect(isProfileDraftComplete(named, options)).toBe(false);
    expect(
      isProfileDraftComplete({ ...named, topics: ["fires"] }, options)
    ).toBe(true);
  });

  it("doesn't require a topic when there are none to pick", () => {
    const named = draft({
      ...REQUIRED,
      receiveNewsEmails: true,
      firstName: "Amina",
      lastName: "Otieno",
    });
    expect(isProfileDraftComplete(named, { ...options, topics: {} })).toBe(
      true
    );
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
    expect(withSector(current, "ngo", options)).toEqual(
      draft({ country: "BRA", language: "pt", sector: "ngo", role: "" })
    );
  });
});

describe("draftFromSuggestion", () => {
  it("maps a full GFW profile onto the draft, keeping known topics", () => {
    expect(
      draftFromSuggestion(fullGfw, options, {
        firstName: "Maria",
        lastName: "Silva",
      })
    ).toEqual(
      draft({
        country: "BRA",
        language: "pt",
        sector: "government",
        role: "analyst",
        organisation: "State environment agency",
        firstName: "Maria",
        lastName: "Silva",
        topics: ["fires"],
      })
    );
  });

  it("never ticks a consent box", () => {
    const seeded = draftFromSuggestion(fullGfw, options);
    expect(seeded.receiveNewsEmails).toBe(false);
    expect(seeded.helpTestFeatures).toBe(false);
  });

  it("drops codes the options don't know", () => {
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

  it("needs the organisation, not a language, to offer confirmation", () => {
    const { preferred_language_code, ...noLanguage } = fullGfw;
    void preferred_language_code;
    expect(profileCardMode(noLanguage, options)).toBe("confirm");

    const { company_organization, ...noOrganisation } = fullGfw;
    void company_organization;
    expect(profileCardMode(noOrganisation, options)).toBe("fields");
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
  it("builds a partial update with no role, no language and no emails", () => {
    expect(toProfilePatch(draft(REQUIRED), options)).toEqual({
      sector_code: "ngo",
      role_code: null,
      country_code: "KEN",
      company_organization: "Kenya Forest Service",
      help_test_features: false,
      receive_news_emails: false,
      has_profile: true,
    });
  });

  it("sends the language and the testing opt-in", () => {
    expect(
      toProfilePatch(
        draft({ ...REQUIRED, language: "en", helpTestFeatures: true }),
        options
      )
    ).toMatchObject({
      preferred_language_code: "en",
      help_test_features: true,
    });
  });

  it("sends names and topics only with the email opt-in", () => {
    const named = draft({
      ...REQUIRED,
      firstName: " Amina ",
      lastName: "Otieno",
      topics: ["water"],
    });
    expect(toProfilePatch(named, options)).not.toHaveProperty("first_name");
    expect(toProfilePatch(named, options)).not.toHaveProperty("topics");

    expect(
      toProfilePatch({ ...named, receiveNewsEmails: true }, options)
    ).toMatchObject({
      receive_news_emails: true,
      first_name: "Amina",
      last_name: "Otieno",
      topics: ["water"],
    });
  });

  it("saves what the person edited, including a cleared language", () => {
    const seeded = draftFromSuggestion(fullGfw, options);
    expect(
      toProfilePatch({ ...seeded, language: "en" }, options)
        .preferred_language_code
    ).toBe("en");
    expect(
      toProfilePatch({ ...seeded, language: "" }, options)
    ).not.toHaveProperty("preferred_language_code");
  });

  it("refuses an incomplete draft", () => {
    expect(() => toProfilePatch(EMPTY_PROFILE_DRAFT, options)).toThrow(
      /required fields/
    );
  });
});
