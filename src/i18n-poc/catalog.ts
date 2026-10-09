import en from "./messages/en.json";
import ptBR from "./messages/pt-BR.json";
import zhHans from "./messages/zh-Hans.json";
import type { Locale } from "./locale";

export type MessageId = keyof typeof en;

export const catalogs: Record<Locale, Record<MessageId, string>> = {
  en,
  "pt-BR": ptBR,
  "zh-Hans": zhHans,
};

export const PROMPT_IDS = [
  "assistant.prompt.grassland",
  "assistant.prompt.forest",
  "assistant.prompt.landcover",
] as const satisfies readonly MessageId[];

/** Fixed values so both engines format the same ICU sample. */
export const SAMPLE_AREA = 1234.5;
export const SAMPLE_DATE = new Date("2024-06-15T12:00:00Z");

export type WelcomeCopy = {
  label: string;
  newConversation: string;
  history: string;
  welcome: string;
  placeholder: string;
  prompts: string[];
  promptCount: string;
  sampleStat: string;
};

export type Translate = (
  id: MessageId,
  values?: Record<string, unknown>
) => string;

export function welcomeCopy(t: Translate): WelcomeCopy {
  return {
    label: t("assistant.label"),
    newConversation: t("assistant.newConversation"),
    history: t("assistant.history"),
    welcome: t("assistant.welcome"),
    placeholder: t("assistant.placeholder"),
    prompts: PROMPT_IDS.map((id) => t(id)),
    promptCount: t("assistant.promptCount", { count: PROMPT_IDS.length }),
    sampleStat: t("assistant.sampleStat", {
      area: SAMPLE_AREA,
      when: SAMPLE_DATE,
    }),
  };
}
