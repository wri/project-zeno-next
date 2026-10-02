/**
 * The in-chat profile card: what it asks for, how a profile found elsewhere
 * (today: MyGFW) seeds it, and what saving it would send.
 */
import type { PatchProfilePartialRequest } from "@/app/schemas/api/auth/profile/patch";
import type { ProfileConfig } from "@/app/schemas/api/profile/config";

/** The dropdown options the card needs, from GET /api/profile/config. */
export type ProfileCardOptions = Pick<
  ProfileConfig,
  "sectors" | "sector_roles" | "countries" | "languages"
>;

/**
 * Card form state, in the order the card asks for it. An empty string means
 * "not chosen". Country and sector are required; language and role are not.
 */
export interface ProfileDraft {
  country: string;
  language: string;
  sector: string;
  role: string;
}

export const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  country: "",
  language: "",
  sector: "",
  role: "",
};

type SuggestedField =
  | "country_code"
  | "preferred_language_code"
  | "sector_code"
  | "role_code"
  | "company_organization";

/**
 * A profile found on the shared Resource Watch user, already mapped to GNW
 * codes (the backend owns the MyGFW label→code and ISO3→ISO2 mapping). Keyed
 * by the PATCH /api/auth/profile field names, so nothing renames it on the
 * way to the form or back; never null (the prefill parser drops absences).
 */
export type ProfileSuggestion = {
  [K in SuggestedField]?: NonNullable<PatchProfilePartialRequest[K]>;
};

/** `confirm`: one-click "Looks right". `fields`: pick country, language, sector, role. */
export type ProfileCardMode = "confirm" | "fields";

/**
 * The card's partial update for PATCH /api/auth/profile. Once terms are
 * stored separately, `has_profile` only means "profile complete".
 */
export type ProfileCardPatch = Required<
  Pick<
    PatchProfilePartialRequest,
    "sector_code" | "role_code" | "country_code" | "has_profile"
  >
> &
  Pick<
    PatchProfilePartialRequest,
    "company_organization" | "preferred_language_code"
  >;

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
  const sector = known(suggestion.sector_code, options.sectors);
  return {
    country: known(suggestion.country_code, options.countries),
    language: known(suggestion.preferred_language_code, options.languages),
    sector,
    role: known(suggestion.role_code, options.sector_roles[sector] ?? {}),
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

/**
 * The PATCH the card sends. Every field it shows comes from the draft (so a
 * language the person changed or cleared is what gets saved); only the
 * organisation, which the card shows but doesn't ask for, comes from the
 * suggestion.
 */
export function toProfilePatch(
  draft: ProfileDraft,
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
  if (draft.language !== "") patch.preferred_language_code = draft.language;
  if (suggestion?.company_organization) {
    patch.company_organization = suggestion.company_organization;
  }
  return patch;
}
