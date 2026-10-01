import { z } from "zod";
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

/**
 * One suggestion field: a non-blank string, else absent. A null or wrongly
 * typed value (the contract says neither happens) is dropped with a warning
 * rather than failing the whole prefill.
 */
function optionalText(key: string) {
  return z
    .string()
    .trim()
    .min(1)
    .optional()
    .catch(({ input }) => {
      if (typeof input !== "string") {
        console.warn(
          `Profile prefill: ignoring ${key} (expected a string, got ${
            input === null ? "null" : typeof input
          })`
        );
      }
      return undefined;
    });
}

// What the slice reads from the wire. Other keys (job_title, topics, and any
// consent flag the backend might ever send) are stripped by z.object.
const PrefillResponseSchema = z.object({
  found: z.boolean(),
  suggestion: z
    .object({
      first_name: optionalText("first_name"),
      last_name: optionalText("last_name"),
      company_organization: optionalText("company_organization"),
      sector_code: optionalText("sector_code"),
      role_code: optionalText("role_code"),
      country_code: optionalText("country_code"),
      preferred_language_code: optionalText("preferred_language_code"),
    })
    .nullable(),
});

/**
 * Parses the prefill response. Throws only when the payload's structure is
 * wrong (`found` not a boolean, `suggestion` neither an object nor null).
 */
export function toProfilePrefill(raw: unknown): ProfilePrefill {
  const parsed = PrefillResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Profile prefill: malformed response (${parsed.error.message})`
    );
  }
  const { found, suggestion: wire } = parsed.data;
  if (!found) return PREFILL_NOT_FOUND;
  if (!wire) return { found: true };

  const { first_name, last_name, ...fields } = wire;
  const prefill: ProfilePrefill = { found: true };
  const suggestion = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  ) as ProfileSuggestion;
  if (Object.keys(suggestion).length > 0) prefill.suggestion = suggestion;
  if (first_name) prefill.firstName = first_name;
  if (last_name) prefill.lastName = last_name;
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
