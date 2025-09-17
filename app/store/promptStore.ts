import { create } from "zustand";
import promptsData from "@/public/welcome-prompts.json";

interface PromptState {
  prompts: string[];
}

export const usePromptStore = create<PromptState>(() => ({
  prompts: promptsData.prompts,
}));
