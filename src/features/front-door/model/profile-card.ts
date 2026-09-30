/**
 * The in-chat profile card: what it asks for, how a profile found elsewhere
 * (today: MyGFW) seeds it, and what saving it would send.
 */

/** The dropdown options the card needs; a structural subset of GET /api/profile/config. */
export interface ProfileCardOptions {
  sectors: Record<string, string>;
  sector_roles: Record<string, Record<string, string>>;
  countries: Record<string, string>;
  languages: Record<string, string>;
}

/** Card form state. An empty string means "not chosen". */
export interface ProfileDraft {
  sector: string;
  role: string;
  country: string;
}

export const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  sector: "",
  role: "",
  country: "",
};

/**
 * A profile found on the shared Resource Watch user, already mapped to GNW
 * codes (the backend owns the MyGFW label→code and ISO3→ISO2 mapping).
 */
export interface ProfileSuggestion {
  source: "gfw";
  organisation?: string;
  sector?: string;
  role?: string;
  country?: string;
  language?: string;
}

/** `confirm`: one-click "Looks right". `fields`: pick sector/country/role. */
export type ProfileCardMode = "confirm" | "fields";

/** Partial update for PATCH /api/auth/profile (backend `UserProfileUpdateRequest`). */
export interface ProfileCardPatch {
  sector_code: string;
  role_code: string | null;
  country_code: string;
  company_organization?: string;
  preferred_language_code?: string;
  /** Once terms are stored separately, `has_profile` only means "profile complete". */
  has_profile: true;
}

export function isProfileDraftComplete(draft: ProfileDraft): boolean {
  return draft.sector !== "" && draft.country !== "";
}

function known(
  value: string | undefined,
  options: Record<string, string>
): string {
  return value !== undefined && value in options ? value : "";
}

/** Changing sector clears a role that doesn't belong to the new sector. */
export function withSector(
  draft: ProfileDraft,
  sector: string,
  options: ProfileCardOptions
): ProfileDraft {
  const roles = options.sector_roles[sector] ?? {};
  return { ...draft, sector, role: known(draft.role, roles) };
}

/** Keeps only codes the options know, so a stale or unmapped value never reaches the form. */
export function draftFromSuggestion(
  suggestion: ProfileSuggestion | undefined,
  options: ProfileCardOptions
): ProfileDraft {
  if (!suggestion) return EMPTY_PROFILE_DRAFT;
  const sector = known(suggestion.sector, options.sectors);
  return {
    sector,
    role: known(suggestion.role, options.sector_roles[sector] ?? {}),
    country: known(suggestion.country, options.countries),
  };
}

/** The one-click confirmation only makes sense when the suggestion covers the required fields. */
export function profileCardMode(
  suggestion: ProfileSuggestion | undefined,
  options: ProfileCardOptions
): ProfileCardMode {
  return isProfileDraftComplete(draftFromSuggestion(suggestion, options))
    ? "confirm"
    : "fields";
}

export function toProfilePatch(
  draft: ProfileDraft,
  options: ProfileCardOptions,
  suggestion?: ProfileSuggestion
): ProfileCardPatch {
  if (!isProfileDraftComplete(draft)) {
    throw new Error("Profile card saved without sector and country");
  }
  const patch: ProfileCardPatch = {
    sector_code: draft.sector,
    role_code: draft.role === "" ? null : draft.role,
    country_code: draft.country,
    has_profile: true,
  };
  if (suggestion?.organisation) {
    patch.company_organization = suggestion.organisation;
  }
  const language = known(suggestion?.language, options.languages);
  if (language !== "") patch.preferred_language_code = language;
  return patch;
}
