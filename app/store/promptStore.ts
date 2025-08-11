import { create } from "zustand";

interface PromptState {
  prompts: string[];
  fetchPrompts: () => Promise<void>;
}

export const usePromptStore = create<PromptState>((set) => ({
  prompts: [],
  fetchPrompts: async () => {
    try {
      const response = await fetch("/welcome-prompts.json");
      const data = await response.json();
      set({ prompts: data.prompts });
    } catch (error) {
      console.error("Error fetching prompts:", error);
    }
  },
}));