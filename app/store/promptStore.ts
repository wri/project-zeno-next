import { create } from "zustand";
import defaultPromptsData from "@/public/welcome-prompts.json";
import { defaultLocale } from "@/app/i18n/config";

interface PromptState {
  prompts: string[];
  isLoading: boolean;
  loadedLanguage: string;
  loadPromptsForLanguage: (lang: string) => Promise<void>;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: defaultPromptsData.prompts,
  isLoading: false,
  loadedLanguage: defaultLocale,

  loadPromptsForLanguage: async (lang: string) => {
    // Already loaded for this language
    if (get().loadedLanguage === lang) return;

    // English uses the statically imported data — no fetch needed
    if (lang === defaultLocale) {
      set({
        prompts: defaultPromptsData.prompts,
        loadedLanguage: defaultLocale,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await fetch(`/welcome-prompts-${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data?.prompts) || data.prompts.length === 0) {
        throw new Error("Invalid prompts format");
      }
      const valid = data.prompts.filter(
        (p: unknown): p is string => typeof p === "string" && p.trim().length > 0,
      );
      if (valid.length === 0) {
        throw new Error("No valid prompts after filtering");
      }
      set({ prompts: valid, loadedLanguage: lang, isLoading: false });
    } catch (err) {
      console.error(`Failed to load prompts for language "${lang}":`, err);
      // Fall back to English prompts on error
      set({
        prompts: defaultPromptsData.prompts,
        loadedLanguage: defaultLocale,
        isLoading: false,
      });
    }
  },
}));
