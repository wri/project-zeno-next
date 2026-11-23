/**
 * Public API of the `locale-switcher` feature (FSD slice): the chat header's
 * language selector. Changing the locale updates the UI with no reload, the
 * `gnw_locale` cookie, `<html lang>` and, when signed in, the profile's
 * preferred language (the field onboarding sets too).
 */
export { LocaleSwitcher } from "./ui/LocaleSwitcher";
