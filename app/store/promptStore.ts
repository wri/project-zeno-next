import { create } from "zustand";
import { SAMPLE_PROMPT_KEYS } from "@/app/constants/sample-prompts";
import { catalogs } from "@/src/shared/lib/i18n";

interface PromptState {
  prompts: string[];
}

/** The landing pages stay English, so they read the English catalog. */
export const usePromptStore = create<PromptState>(() => ({
  prompts: SAMPLE_PROMPT_KEYS.map((key) => catalogs.en[key]),
}));
