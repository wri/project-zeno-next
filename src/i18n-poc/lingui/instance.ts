import { setupI18n, type I18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { catalogs, type MessageId, type Translate } from "../catalog";
import { DEFAULT_LOCALE, type Locale } from "../locale";

/**
 * Runtime compiler so this spike can load the same ICU JSON as i18next
 * without a Vite/babel macro plugin. A production Lingui setup would
 * precompile catalogs and drop `@lingui/message-utils` from the bundle.
 */
export function createLingui(locale: Locale = DEFAULT_LOCALE): I18n {
  const i18n = setupI18n();
  i18n.setMessagesCompiler(compileMessage);
  i18n.load({
    en: catalogs.en,
    "pt-BR": catalogs["pt-BR"],
    "zh-Hans": catalogs["zh-Hans"],
  });
  i18n.activate(locale);
  return i18n;
}

export function translateWith(i18n: I18n, locale?: Locale): Translate {
  return (id: MessageId, values) => {
    if (locale && i18n.locale !== locale) i18n.activate(locale);
    return i18n._(id, values);
  };
}
