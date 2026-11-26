import type { MessageKey } from "@/src/shared/lib/i18n";

/**
 * The chat's sample prompts, as catalog keys: Zeno's own suggestions follow
 * the UI language. The landing pages stay English and read these from the
 * English catalog.
 */
export const SAMPLE_PROMPT_KEYS = [
  "chat.samplePrompt.1",
  "chat.samplePrompt.2",
  "chat.samplePrompt.3",
  "chat.samplePrompt.4",
  "chat.samplePrompt.5",
  "chat.samplePrompt.6",
  "chat.samplePrompt.7",
  "chat.samplePrompt.8",
  "chat.samplePrompt.9",
  "chat.samplePrompt.10",
  "chat.samplePrompt.11",
  "chat.samplePrompt.12",
  "chat.samplePrompt.13",
  "chat.samplePrompt.14",
  "chat.samplePrompt.15",
  "chat.samplePrompt.16",
  "chat.samplePrompt.17",
] as const satisfies readonly MessageKey[];
