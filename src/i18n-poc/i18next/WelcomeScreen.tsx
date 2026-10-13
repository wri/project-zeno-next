import { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import type { i18n as I18nInstance } from "i18next";
import { welcomeCopy } from "../catalog";
import type { Locale } from "../locale";
import { WelcomeView } from "../WelcomeView";
import { createI18next } from "./instance";

function I18nextWelcome() {
  const { t } = useTranslation();
  return (
    <WelcomeView
      copy={welcomeCopy((id, values) => t(id, values))}
      engine="react-i18next"
    />
  );
}

export function I18nextWelcomeScreen({ locale }: { locale: Locale }) {
  const [instance] = useState<I18nInstance>(() => createI18next(locale));

  useEffect(() => {
    void instance.changeLanguage(locale);
  }, [instance, locale]);

  return (
    <I18nextProvider i18n={instance}>
      <I18nextWelcome />
    </I18nextProvider>
  );
}
