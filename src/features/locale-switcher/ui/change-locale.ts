import {
  applyLocale,
  rememberLocale,
  type Locale,
} from "@/src/shared/lib/i18n";

/**
 * A display-language choice from the header: switch the UI at once (no
 * reload) and remember it on this device. The profile's preferred language
 * (comms, and the default on other devices) is left alone (PZB-1722).
 */
export function changeLocale(locale: Locale): void {
  rememberLocale(locale);
  applyLocale(locale);
}
