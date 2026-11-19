import { NativeSelect } from "@chakra-ui/react";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";
import {
  isLocale,
  LOCALES,
  useLocale,
  useTranslation,
  type Locale,
} from "@/src/shared/lib/i18n";
import { changeLocale } from "./change-locale";

/** Each language in its own name, so a reader finds theirs in any locale. */
const ENDONYMS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
  id: "Bahasa Indonesia",
  zh: "中文",
};

const LOCALE_SWITCHER_FLAG = "i18n";

/**
 * Translation-review switcher, shown only with `?ff=i18n` until the
 * user-facing selector (PZB-960) ships.
 */
export function LocaleSwitcher() {
  const enabled = useFeatureFlag(LOCALE_SWITCHER_FLAG);
  const locale = useLocale();
  const { t } = useTranslation();
  if (!enabled) return null;

  return (
    <NativeSelect.Root size="xs" width="auto" variant="plain">
      <NativeSelect.Field
        aria-label={t("chat.header.language")}
        value={locale}
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (isLocale(value)) void changeLocale(value);
        }}
        fontSize="xs"
        color="neutral.600"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {ENDONYMS[l]}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}
