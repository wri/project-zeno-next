"use client";

import { i18n, useTranslation, type MessageKey } from "@/src/shared/lib/i18n";

/*
 * The name of a control whose component renders an i18n message. The tour
 * takes it from the same key, so it matches the screen in the user's locale;
 * the tour's own copy stays English. tests/architecture/tour-contract.test.ts
 * checks that the component renders the key the tour uses.
 */

/** For copy in JSX. A hook, so the name changes when the locale does. */
export function UiLabel({ i18nKey }: { i18nKey: MessageKey }) {
  const { t } = useTranslation();
  return <>{t(i18nKey)}</>;
}

/** For copy that must be a string (status lines, hints): the locale now. */
export function uiLabelText(i18nKey: MessageKey): string {
  return i18n.t(i18nKey);
}
