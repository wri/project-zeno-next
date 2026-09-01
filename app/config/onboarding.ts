export type OnboardingFieldKey =
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
  | "helpTestFeatures"
  | "termsAccepted";

/**
 * The fields a user must complete before they can submit the onboarding form.
 *
 * Single source of truth — this list drives all three of:
 *   - Zod validation (`app/onboarding/schema.ts`), which gates the submit button
 *   - `aria-required` on each `Field.Root`
 *   - the visible red asterisk (`<RequiredMark />` in `app/onboarding/form.tsx`)
 *
 * Any key omitted here is optional. Add or remove a key and the label, the
 * accessibility attribute, and the validation all follow automatically.
 */
export const REQUIRED_ONBOARDING_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "sector",
  "role",
  "company",
  "country",
  "termsAccepted",
] as const satisfies readonly OnboardingFieldKey[];

const REQUIRED_FIELD_SET: ReadonlySet<OnboardingFieldKey> = new Set(
  REQUIRED_ONBOARDING_FIELDS
);

export function isOnboardingFieldRequired(key: OnboardingFieldKey): boolean {
  return REQUIRED_FIELD_SET.has(key);
}
