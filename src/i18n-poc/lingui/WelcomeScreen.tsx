import { useEffect, useState } from "react";
import type { I18n } from "@lingui/core";
import { I18nProvider, useLingui } from "@lingui/react";
import { welcomeCopy } from "../catalog";
import type { Locale } from "../locale";
import { WelcomeView } from "../WelcomeView";
import { createLingui } from "./instance";

function LinguiWelcome() {
  const { i18n } = useLingui();
  return (
    <WelcomeView
      copy={welcomeCopy((id, values) => i18n._(id, values))}
      engine="lingui"
    />
  );
}

export function LinguiWelcomeScreen({ locale }: { locale: Locale }) {
  const [i18n] = useState<I18n>(() => createLingui(locale));

  useEffect(() => {
    i18n.activate(locale);
  }, [i18n, locale]);

  return (
    <I18nProvider i18n={i18n}>
      <LinguiWelcome />
    </I18nProvider>
  );
}
