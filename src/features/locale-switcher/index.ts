/**
 * Public API of the `locale-switcher` feature (FSD slice): the flagged
 * translation-review switcher (`?ff=i18n`). Changing the locale updates the
 * UI with no reload, the `gnw_locale` cookie, `<html lang>` and, when signed
 * in, the profile language.
 */
export { LocaleSwitcher } from "./ui/LocaleSwitcher";
