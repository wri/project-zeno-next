import type { CodeActPart } from "@/app/types/chat";

/**
 * The well-formed provenance parts of an insight's raw `codeact_parts`; `[]`
 * when the value is absent, null, not an array, or holds only malformed
 * entries. Tolerant on purpose: provenance is display-only, so a bad entry is
 * dropped rather than failing the insight.
 */
export function codeActParts(raw: unknown): CodeActPart[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (part): part is CodeActPart =>
      typeof part === "object" &&
      part !== null &&
      typeof (part as CodeActPart).type === "string" &&
      typeof (part as CodeActPart).content === "string"
  );
}

/**
 * Whether an insight is curated (a deterministic, LLM-free analysis) rather
 * than AI-generated. The backend has no explicit flag; the agent's
 * `generate_insights` always records its CodeAct provenance, while
 * `POST /api/analyze` persists `codeact_parts: []`, so "no well-formed
 * provenance" is the shared rule. Every surface that labels an insight
 * (workspace caption, dashboard module, Analyses pane) must classify through
 * here so they can never disagree.
 */
export function isCuratedInsight(codeactParts: unknown): boolean {
  return codeActParts(codeactParts).length === 0;
}
