import { matchLocale, type Locale } from "@/src/shared/lib/i18n";

// The default speech-recognition tag per UI locale. Region qualification
// meaningfully improves recognition accuracy; pt-BR in particular fits GNW's
// Amazonia focus. All values are locales Chrome's SpeechRecognition accepts.
const REGION_QUALIFIED: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  id: "id-ID",
  zh: "zh-CN",
};

export interface VoiceLanguageVariant {
  /** BCP-47 tag passed to SpeechRecognition. */
  code: string;
  /** Full display label, e.g. "English (US)". */
  name: string;
  /** Short chip label, e.g. "US". */
  tag: string;
}

export interface VoiceLanguageFamily {
  /** English display name, e.g. "English". */
  base: string;
  /** Endonym, e.g. "Español". */
  native: string;
  /** Surfaced in the picker's "Common" shortlist. */
  common?: boolean;
  /** Regional variants; mutually exclusive with `code`. */
  variants?: VoiceLanguageVariant[];
  /** BCP-47 tag for a single-variant language; mutually exclusive with `variants`. */
  code?: string;
}

// The full catalogue offered in the dictation picker. Every code is a locale
// the browser's Web Speech API accepts. `common` languages form the shortlist
// shown before the user searches or expands the full list.
export const VOICE_LANGUAGE_FAMILIES: VoiceLanguageFamily[] = [
  {
    base: "English",
    native: "English",
    common: true,
    variants: [
      { code: "en-US", name: "English (US)", tag: "US" },
      { code: "en-GB", name: "English (UK)", tag: "UK" },
    ],
  },
  {
    base: "Spanish",
    native: "Español",
    common: true,
    variants: [
      { code: "es-ES", name: "Spanish (Spain)", tag: "Spain" },
      { code: "es-419", name: "Spanish (Latin America)", tag: "LatAm" },
    ],
  },
  {
    base: "Portuguese",
    native: "Português",
    common: true,
    variants: [
      { code: "pt-BR", name: "Portuguese (BR)", tag: "Brasil" },
      { code: "pt-PT", name: "Portuguese (PT)", tag: "Portugal" },
    ],
  },
  {
    base: "Chinese",
    native: "中文",
    common: true,
    variants: [
      { code: "zh-CN", name: "Chinese (Simplified)", tag: "Simpl." },
      { code: "zh-TW", name: "Chinese (Traditional)", tag: "Trad." },
    ],
  },
  { base: "French", native: "Français", common: true, code: "fr-FR" },
  { base: "Arabic", native: "العربية", common: true, code: "ar-SA" },
  { base: "Hindi", native: "हिन्दी", common: true, code: "hi-IN" },
  {
    base: "Indonesian",
    native: "Bahasa Indonesia",
    common: true,
    code: "id-ID",
  },
  { base: "Bengali", native: "বাংলা", code: "bn-IN" },
  { base: "Czech", native: "Čeština", code: "cs-CZ" },
  { base: "Danish", native: "Dansk", code: "da-DK" },
  { base: "Dutch", native: "Nederlands", code: "nl-NL" },
  { base: "Filipino", native: "Filipino", code: "fil-PH" },
  { base: "Finnish", native: "Suomi", code: "fi-FI" },
  { base: "German", native: "Deutsch", code: "de-DE" },
  { base: "Greek", native: "Ελληνικά", code: "el-GR" },
  { base: "Gujarati", native: "ગુજરાતી", code: "gu-IN" },
  { base: "Hungarian", native: "Magyar", code: "hu-HU" },
  { base: "Italian", native: "Italiano", code: "it-IT" },
  { base: "Japanese", native: "日本語", code: "ja-JP" },
  { base: "Kiswahili", native: "Kiswahili", code: "sw-KE" },
  { base: "Korean", native: "한국어", code: "ko-KR" },
  { base: "Malay", native: "Bahasa Melayu", code: "ms-MY" },
  { base: "Norwegian", native: "Norsk", code: "nb-NO" },
  { base: "Polish", native: "Polski", code: "pl-PL" },
  { base: "Romanian", native: "Română", code: "ro-RO" },
  { base: "Russian", native: "Русский", code: "ru-RU" },
  { base: "Swedish", native: "Svenska", code: "sv-SE" },
  { base: "Tamil", native: "தமிழ்", code: "ta-IN" },
  { base: "Telugu", native: "తెలుగు", code: "te-IN" },
  { base: "Thai", native: "ภาษาไทย", code: "th-TH" },
  { base: "Turkish", native: "Türkçe", code: "tr-TR" },
  { base: "Ukrainian", native: "Українська", code: "uk-UA" },
  { base: "Urdu", native: "اردو", code: "ur-PK" },
  { base: "Vietnamese", native: "Tiếng Việt", code: "vi-VN" },
];

export interface VoiceLanguage {
  /** BCP-47 tag passed to SpeechRecognition. */
  code: string;
  label: string;
}

// Flat {code,label} list derived from the family catalogue, for label lookups.
export const VOICE_LANGUAGES: VoiceLanguage[] = VOICE_LANGUAGE_FAMILIES.flatMap(
  (f) =>
    f.variants
      ? f.variants.map((v) => ({ code: v.code, label: v.name }))
      : [{ code: f.code as string, label: f.base }]
);

/**
 * Human-readable label for a BCP-47 tag, for the dictation language trigger.
 * Falls back to the raw tag when it isn't one of the offered options.
 */
export function labelForLang(code: string): string {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

/**
 * The default dictation language: the UI locale (from the shared resolver),
 * region-qualified. The Web Speech API cannot detect the spoken language, so
 * it follows the UI. When the browser lists a regional tag of the same
 * language (e.g. "pt-PT" for a "pt" UI) that region is kept for its accent.
 */
export function speechLangForLocale(
  locale: Locale,
  browserLanguages: readonly string[]
): string {
  if (locale === "zh") return REGION_QUALIFIED.zh;
  const regional = browserLanguages.find(
    (tag) => tag.includes("-") && matchLocale(tag) === locale
  );
  return regional ?? REGION_QUALIFIED[locale];
}
