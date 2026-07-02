import type { AnalyseSuggestion } from "@/app/types/chat";

/**
 * Builds the structured prompt injected into the agent when the user accepts
 * the analyse CTA. The AOI and dataset are also carried via ui_context (built
 * by chatStore.sendMessage from the active map layers + date range), so the
 * prompt only needs to be a clear, human-readable instruction.
 */
export function buildAnalysisPrompt(suggestion: AnalyseSuggestion): string {
  return `Analyse ${suggestion.datasetName} in ${suggestion.areaName}.`;
}
