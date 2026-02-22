/**
 * Centralized i18n configuration.
 *
 * Defines the supported locales and the default locale used throughout the
 * application. Import from here instead of duplicating locale lists.
 */

export const locales = ["en", "fr", "es", "pt", "id"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Quick membership check for valid locale codes. */
export const localeSet = new Set<string>(locales);
