/**
 * The in-chat profile card: what it asks for, how a profile found elsewhere
 * (today: MyGFW) seeds it, and what saving it would send.
 */
import type { PatchProfilePartialRequest } from "@/app/schemas/api/auth/profile/patch";
import type { ProfileConfig } from "@/app/schemas/api/profile/config";
import type { PersonNames } from "../lib/person-names";

/** The option lists the card needs, from GET /api/profile/config. */
export type ProfileCardOptions = Pick<
  ProfileConfig,
  "sectors" | "countries" | "languages" | "topics"
>;

/**
 * Card form state, in the order the card asks for it. An empty string means
 * "not chosen". Country, sector and organisation are required; language is
 * not. Role is optional on the full profile form, so the card leaves it out.
 * The names and topics are asked for only with the email list opt-in, and
 * are then required.
 */
export interface ProfileDraft {
  country: string;
  language: string;
  sector: string;
  organisation: string;
  helpTestFeatures: boolean;
  receiveNewsEmails: boolean;
  firstName: string;
  lastName: string;
  topics: string[];
}

export const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  country: "",
  language: "",
  sector: "",
  organisation: "",
  helpTestFeatures: false,
  receiveNewsEmails: false,
  firstName: "",
  lastName: "",
  topics: [],
};

type SuggestedField =
  | "country_code"
  | "preferred_language_code"
  | "sector_code"
  | "company_organization"
  | "topics";

/**
 * A profile found on the shared Resource Watch user, already mapped to GNW
 * codes (the backend owns the MyGFW label→code and ISO3→ISO2 mapping). Keyed
 * by the PATCH /api/auth/profile field names, so nothing renames it on the
 * way to the form or back; never null (the prefill parser drops absences).
 * There are deliberately no consent flags: the card never ticks one for
 * someone.
 */
export type ProfileSuggestion = {
  [K in SuggestedField]?: NonNullable<PatchProfilePartialRequest[K]>;
};

/** `confirm`: one-click "Looks right". `fields`: fill in the form. */
export type ProfileCardMode = "confirm" | "fields";

/**
 * The card's partial update for PATCH /api/auth/profile. Once terms are
 * stored separately, `has_profile` only means "profile complete".
 */
export type ProfileCardPatch = Required<
  Pick<
    PatchProfilePartialRequest,
    | "sector_code"
    | "country_code"
    | "company_organization"
    | "help_test_features"
    | "receive_news_emails"
    | "has_profile"
  >
> &
  Pick<
    PatchProfilePartialRequest,
    "preferred_language_code" | "first_name" | "last_name" | "topics"
  >;

function hasTopicOptions(options: ProfileCardOptions): boolean {
  return Object.keys(options.topics ?? {}).length > 0;
}

/** The email list's fields: required only once the person opts in. */
function emailFieldsComplete(
  draft: ProfileDraft,
  options: ProfileCardOptions
): boolean {
  if (!draft.receiveNewsEmails) return true;
  return (
    draft.firstName.trim() !== "" &&
    draft.lastName.trim() !== "" &&
    (draft.topics.length > 0 || !hasTopicOptions(options))
  );
}

/** The fields "Looks right" vouches for: the card's required ones. */
function requiredFieldsComplete(draft: ProfileDraft): boolean {
  return (
    draft.sector !== "" &&
    draft.country !== "" &&
    draft.organisation.trim() !== ""
  );
}

export function isProfileDraftComplete(
  draft: ProfileDraft,
  options: ProfileCardOptions
): boolean {
  return requiredFieldsComplete(draft) && emailFieldsComplete(draft, options);
}

function known(
  value: string | undefined,
  options: Record<string, string>
): string {
  return value !== undefined && value in options ? value : "";
}

/**
 * Seeds the form. Keeps only codes the options know, so a stale or unmapped
 * value never reaches the form; names (for the email list) come from GFW,
 * else the Resource Watch account.
 */
export function draftFromSuggestion(
  suggestion: ProfileSuggestion | undefined,
  options: ProfileCardOptions,
  names: PersonNames = {}
): ProfileDraft {
  const s = suggestion ?? {};
  const topics = options.topics ?? {};
  return {
    ...EMPTY_PROFILE_DRAFT,
    country: known(s.country_code, options.countries),
    language: known(s.preferred_language_code, options.languages),
    sector: known(s.sector_code, options.sectors),
    organisation: s.company_organization ?? "",
    firstName: names.firstName ?? "",
    lastName: names.lastName ?? "",
    topics: (s.topics ?? []).filter((code) => code in topics),
  };
}

/** The one-click confirmation only makes sense when the suggestion covers the required fields. */
export function profileCardMode(
  suggestion: ProfileSuggestion | undefined,
  options: ProfileCardOptions
): ProfileCardMode {
  return requiredFieldsComplete(draftFromSuggestion(suggestion, options))
    ? "confirm"
    : "fields";
}

/**
 * The PATCH the card sends, all from the draft (so a value the person
 * changed or cleared is what gets saved). No role_code, so a role set on the
 * full profile form is left alone. The names and topics go only with the
 * email list opt-in.
 */
export function toProfilePatch(
  draft: ProfileDraft,
  options: ProfileCardOptions
): ProfileCardPatch {
  if (!isProfileDraftComplete(draft, options)) {
    throw new Error("Profile card saved without its required fields");
  }
  const patch: ProfileCardPatch = {
    sector_code: draft.sector,
    country_code: draft.country,
    company_organization: draft.organisation.trim(),
    help_test_features: draft.helpTestFeatures,
    receive_news_emails: draft.receiveNewsEmails,
    has_profile: true,
  };
  if (draft.language !== "") patch.preferred_language_code = draft.language;
  if (draft.receiveNewsEmails) {
    patch.first_name = draft.firstName.trim();
    patch.last_name = draft.lastName.trim();
    if (draft.topics.length > 0) patch.topics = draft.topics;
  }
  return patch;
}
