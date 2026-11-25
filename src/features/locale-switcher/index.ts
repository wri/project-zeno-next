/**
 * Public API of the `locale-switcher` feature (FSD slice): the chat header's
 * display-language selector. Changing it updates the UI with no reload, the
 * `gnw_locale` cookie (this device's choice) and `<html lang>`. The profile's
 * preferred language is set in onboarding and user settings, not here.
 */
export { LocaleSwitcher } from "./ui/LocaleSwitcher";
