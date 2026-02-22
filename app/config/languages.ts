/**
 * Centralized list of supported languages.
 *
 * Imported by onboarding, dashboard, language selector, and prompt-loading
 * logic so the set of codes is defined in exactly one place.
 */

export interface SupportedLanguage {
  label: string;
  value: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { label: "English", value: "en" },
  { label: "Français", value: "fr" },
  { label: "Español", value: "es" },
  { label: "Português", value: "pt" },
  { label: "Bahasa Indonesia", value: "id" },
];

/** The set of valid language codes for quick membership checks. */
export const SUPPORTED_LANGUAGE_CODES = new Set(
  SUPPORTED_LANGUAGES.map((l) => l.value)
);

export const DEFAULT_LANGUAGE = "en";
