import { getOnboardingFormSchema } from "@/app/onboarding/schema";

/**
 * Validation for the user settings form (/dashboard).
 *
 * Settings reuses the onboarding contract — `REQUIRED_ONBOARDING_FIELDS`
 * drives both forms — so a field can never be mandatory during onboarding yet
 * clearable from settings. The one difference: terms acceptance happened at
 * onboarding and is not re-asked here, so that key is dropped.
 */
export const getSettingsFormSchema = () =>
  getOnboardingFormSchema().omit({ termsAccepted: true });

export type SettingsFormSchema = ReturnType<typeof getSettingsFormSchema>;
