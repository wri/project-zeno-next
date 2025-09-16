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
  | "topics"
  | "receiveNewsEmails"
  | "helpTestFeatures"
  | "termsAccepted";

const ALL_FIELD_KEYS: readonly OnboardingFieldKey[] = [
  "firstName",
  "lastName",
  "email",
  "sector",
  "role",
  "jobTitle",
  "company",
  "country",
  "expertise",
  "topics",
  "receiveNewsEmails",
  "helpTestFeatures",
  "termsAccepted",
] as const;

// By default, all fields except marketing/opt-in checkboxes are required.
export const DEFAULT_REQUIRED_ONBOARDING_FIELDS: readonly OnboardingFieldKey[] =
  ALL_FIELD_KEYS.filter(
    (k) =>
      k !== "receiveNewsEmails" &&
      k !== "helpTestFeatures" &&
      k !== "expertise" &&
      k !== "jobTitle"
  ) as OnboardingFieldKey[];

/**
 * Reads NEXT_PUBLIC_ONBOARDING_REQUIRED_FIELDS, a comma-separated list of keys,
 * validates against known field keys, and returns a Set for fast lookups.
 * If the env var is unset or invalid, falls back to DEFAULT_REQUIRED_ONBOARDING_FIELDS.
 */
export function getOnboardingRequiredFields(): ReadonlySet<OnboardingFieldKey> {
  const env = process.env.NEXT_PUBLIC_ONBOARDING_REQUIRED_FIELDS;
  if (!env || typeof env !== "string") {
    return new Set(DEFAULT_REQUIRED_ONBOARDING_FIELDS);
  }

  const requested = env
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0) as string[];

  const valid = requested.filter((key): key is OnboardingFieldKey =>
    (ALL_FIELD_KEYS as readonly string[]).includes(key)
  );

  if (valid.length === 0) {
    return new Set(DEFAULT_REQUIRED_ONBOARDING_FIELDS);
  }

  return new Set(valid);
}

export function isOnboardingFieldRequired(key: OnboardingFieldKey): boolean {
  return getOnboardingRequiredFields().has(key);
}
