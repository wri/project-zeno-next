/**
 * Public API of the `locale-switcher` feature (FSD slice): the global header's
 * display-language selector (see `resolveLocale` for how it ranks against the
 * preferred language). Changing it updates the UI with no reload, the
 * `gnw_locale` cookie (this device's choice) and `<html lang>`. The profile's
 * preferred language is set in onboarding and user settings, not here.
 */
export { LocaleSwitcher } from "./ui/LocaleSwitcher";
