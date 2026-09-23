import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import type { AnalyseSuggestion, InputSource } from "@/app/types/chat";
import { buildAnalysisPrompt } from "./buildAnalysisPrompt";

/**
 * Runs the analysis for an accepted analyse CTA.
 *
 * MVP route is generative: inject a structured prompt into the agent via the
 * existing chat pipeline (AOI + dataset travel in ui_context, derived from the
 * active map layers). A future enhancement may serve a curated default from the
 * analytics API instead — that swap should be contained to this module.
 */
export function runAnalysis(
  suggestion: AnalyseSuggestion,
  // Required so each entry point (analyse CTA vs map AOI menu) states its own.
  inputSource: Extract<InputSource, "analyse_nudge" | "map_action">
): void {
  useMapStore.getState().clearAnalysis();
  void useChatStore
    .getState()
    .sendMessage(buildAnalysisPrompt(suggestion), { inputSource });
}
