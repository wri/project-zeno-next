export type ProfileFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "sector"
  | "role"
  | "jobTitle"
  | "company"
  | "country"
  | "expertise"
  | "preferredLanguage"
  | "topics"
  | "receiveNewsEmails"
  | "helpTestFeatures";

/**
 * The fields a user must complete before they can save the profile form
 * (User Profile, /dashboard).
 *
 * Single source of truth — this list drives all three of:
 *   - Zod validation (`app/dashboard/schema.ts`), which gates the save button
 *   - `aria-required` on each `Field.Root`
 *   - the visible marker — a red asterisk, or "(Optional)" — rendered by
 *     `RequirementHint` (`app/components/RequirementHint.tsx`)
 *
 * Any key omitted here is optional. Add or remove a key and the label, the
 * accessibility attribute, and the validation all follow automatically.
 */
export const REQUIRED_PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "sector",
  "role",
  "company",
  "country",
] as const satisfies readonly ProfileFieldKey[];

const REQUIRED_FIELD_SET: ReadonlySet<ProfileFieldKey> = new Set(
  REQUIRED_PROFILE_FIELDS
);

export function isProfileFieldRequired(key: ProfileFieldKey): boolean {
  return REQUIRED_FIELD_SET.has(key);
}
