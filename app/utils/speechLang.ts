// Bare ISO-639-1 codes (as stored in the user's onboarding profile) mapped to
// region-qualified BCP-47 tags. Region qualification meaningfully improves
// speech-recognition accuracy; pt-BR in particular fits GNW's Amazonia focus.
// All values are locales Chrome's SpeechRecognition accepts.
const REGION_QUALIFIED: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  id: "id-ID",
};

const DEFAULT_LANG = "en-US";

interface VoiceLanguage {
  /** BCP-47 tag passed to SpeechRecognition. */
  code: string;
  label: string;
}

// The languages offered in the dictation override menu (a superset of the
// onboarding options). Codes are BCP-47 tags passed to SpeechRecognition.
export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "pt-BR", label: "Portuguese (BR)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-419", label: "Spanish (Latin America)" },
  { code: "fr-FR", label: "French" },
  { code: "it-IT", label: "Italian" },
  { code: "id-ID", label: "Indonesian" },
  { code: "zh-CN", label: "Chinese (Mandarin)" },
  { code: "sw-KE", label: "Swahili" },
];

/**
 * Human-readable label for a BCP-47 tag, for the dictation language menu.
 * Falls back to the raw tag when it isn't one of the offered options.
 */
export function labelForLang(code: string): string {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

/**
 * Resolve a BCP-47 language tag for the Web Speech API. The Web Speech API
 * cannot detect the spoken language itself, so we default from what the app
 * already knows, in priority order:
 *   1. the user's onboarding language preference (`preferredLanguageCode`)
 *   2. the browser's preferred language (`navigator.language`)
 *   3. `en-US`
 *
 * A bare ISO code (e.g. "pt") is region-qualified for better accent handling;
 * an already-qualified tag (e.g. "en-GB") is trusted as-is.
 */
export function resolveSpeechLang(
  preferredCode?: string | null,
  browserLang?: string | null
): string {
  const raw = preferredCode?.trim() || browserLang?.trim() || DEFAULT_LANG;
  // Already region-qualified — trust it rather than overriding the region.
  if (raw.includes("-")) return raw;
  return REGION_QUALIFIED[raw.toLowerCase()] ?? raw;
}
