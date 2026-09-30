import { apiFetch } from "@/app/lib/api-client";
import type { ProfileSuggestion } from "../model/profile-card";

// ── Wire types: GET /api/auth/profile/prefill exactly as the backend sends it ──
// Suggestion keys are PATCH /api/auth/profile field names, present only when
// the backend could map them from the person's GFW profile (never null).
// There are deliberately no consent flags (news emails, feature testing):
// "Looks right" must never tick a consent box on someone's behalf.

export interface ProfilePrefillSuggestionWire {
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company_organization?: string;
  sector_code?: string;
  role_code?: string;
  country_code?: string;
  preferred_language_code?: string;
  topics?: string[];
}

export type ProfilePrefillResponseWire =
  | { found: true; source: "gfw"; suggestion: ProfilePrefillSuggestionWire }
  | { found: false; source: null; suggestion: null };

// ── Normalised type: the only shape the rest of the slice reads ──

export interface ProfilePrefill {
  /** A GFW profile exists for this account (shown on /welcome). */
  found: boolean;
  /**
   * What the profile card can prefill. Undefined when nothing it shows was
   * mapped, so the card never says "we found part of your profile" with
   * every field still empty.
   */
  suggestion?: ProfileSuggestion;
  /** Only for the Ortto submission; the card neither shows nor saves them. */
  firstName?: string;
  lastName?: string;
}

export const PREFILL_NOT_FOUND: ProfilePrefill = { found: false };

type SuggestionKey = keyof ProfilePrefillSuggestionWire;

/**
 * Parses the prefill response. Throws only when the payload's structure is
 * wrong (`found` not a boolean, `suggestion` neither an object nor null).
 * Inside the suggestion, a null or wrongly typed value is treated as absent
 * with a warning, and blank strings as absent.
 */
export function toProfilePrefill(raw: unknown): ProfilePrefill {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Profile prefill: response is not an object");
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.found !== "boolean") {
    throw new Error("Profile prefill: `found` is not a boolean");
  }
  const rawSuggestion = body.suggestion;
  if (
    rawSuggestion !== null &&
    (typeof rawSuggestion !== "object" || Array.isArray(rawSuggestion))
  ) {
    throw new Error(
      "Profile prefill: `suggestion` is neither an object nor null"
    );
  }
  if (!body.found || rawSuggestion === null) {
    return body.found ? { found: true } : PREFILL_NOT_FOUND;
  }

  const fields = rawSuggestion as Record<string, unknown>;
  const text = (key: SuggestionKey): string | undefined => {
    const value = fields[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
      console.warn(
        `Profile prefill: ignoring ${key} (expected a string, got ${
          value === null ? "null" : typeof value
        })`
      );
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const suggestion: ProfileSuggestion = { source: "gfw" };
  const organisation = text("company_organization");
  const sector = text("sector_code");
  const role = text("role_code");
  const country = text("country_code");
  const language = text("preferred_language_code");
  if (organisation) suggestion.organisation = organisation;
  if (sector) suggestion.sector = sector;
  if (role) suggestion.role = role;
  if (country) suggestion.country = country;
  if (language) suggestion.language = language;
  const hasCardField = Object.keys(suggestion).length > 1;

  const prefill: ProfilePrefill = { found: true };
  if (hasCardField) prefill.suggestion = suggestion;
  const firstName = text("first_name");
  const lastName = text("last_name");
  if (firstName) prefill.firstName = firstName;
  if (lastName) prefill.lastName = lastName;
  return prefill;
}

/**
 * GET /api/auth/profile/prefill. Any non-2xx (e.g. 404 before the backend
 * ships the endpoint) means "no GFW profile"; a network error throws.
 */
export async function fetchProfilePrefill(): Promise<ProfilePrefill> {
  const res = await apiFetch("/api/auth/profile/prefill", {
    cache: "no-store",
  });
  if (!res.ok) return PREFILL_NOT_FOUND;
  return toProfilePrefill(await res.json());
}
