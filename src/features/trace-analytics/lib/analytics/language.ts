/**
 * Client-side prompt-language fallback. The Zeno API defines a `language`
 * field (server-side langid over the prompt) but does not populate it on all
 * deployments yet; until it does, detect locally with franc (trigram-based,
 * offline) so language-aware charts and outcome flags work either way.
 */

import { francAll } from "franc-min";
import type { TraceRow } from "../../model/types";

/** Mirrors the server-side langid guard: skip very short prompts. */
const MIN_DETECT_LENGTH = 12;

/**
 * Trigram detection is unreliable on short queries ("What is DIST alert?"
 * scores German first). Downstream consumers flag *non-English* traffic, so
 * false non-English calls are the expensive direction: when English scores
 * within this fraction of the winner, report unknown instead of the winner.
 */
const ENGLISH_AMBIGUITY_SCORE = 0.8;

/** franc returns ISO 639-3; the server's langid field uses ISO 639-1. */
const ISO3_TO_ISO1: Readonly<Record<string, string>> = {
  eng: "en",
  spa: "es",
  por: "pt",
  fra: "fr",
  deu: "de",
  ita: "it",
  nld: "nl",
  ind: "id",
  msa: "ms",
  swh: "sw",
  hin: "hi",
  ben: "bn",
  rus: "ru",
  ukr: "uk",
  pol: "pl",
  tur: "tr",
  vie: "vi",
  tha: "th",
  jpn: "ja",
  kor: "ko",
  cmn: "zh",
  arb: "ar",
  pes: "fa",
  urd: "ur",
  ron: "ro",
  ces: "cs",
  ell: "el",
  swe: "sv",
  dan: "da",
  nob: "no",
  fin: "fi",
  hun: "hu",
  amh: "am",
  hau: "ha",
  yor: "yo",
  zul: "zu",
};

const CANDIDATE_LANGUAGES = Object.keys(ISO3_TO_ISO1);

/** Detected ISO 639-1 code for a prompt, or null when too short/uncertain. */
export function detectPromptLanguage(prompt: unknown): string | null {
  const text = String(prompt ?? "").trim();
  if (text.length < MIN_DETECT_LENGTH) return null;
  const ranked = francAll(text, {
    minLength: MIN_DETECT_LENGTH,
    only: CANDIDATE_LANGUAGES,
  });
  const top = ranked[0];
  if (!top || top[0] === "und") return null;
  if (top[0] === "eng") return "en";
  const engScore = ranked.find(([lang]) => lang === "eng")?.[1] ?? 0;
  if (engScore >= ENGLISH_AMBIGUITY_SCORE) return null;
  return ISO3_TO_ISO1[top[0]] ?? top[0];
}

/** Fill `language` from local detection wherever the API left it null. */
export function withDetectedLanguage(
  rows: readonly TraceRow[]
): readonly TraceRow[] {
  return rows.map((row) =>
    row.language ? row : { ...row, language: detectPromptLanguage(row.prompt) }
  );
}

export interface LanguageOutcomeMix {
  /** ISO 639-1 code (display mapping happens at the chart). */
  readonly label: string;
  readonly total: number;
  /** Outcome code (ANSWER, ERROR, …) → trace count. */
  readonly counts: Readonly<Record<string, number>>;
}

/** Outcome composition per detected prompt language, largest first. */
export function computeOutcomeMixByLanguage(
  rows: readonly TraceRow[],
  topN = 8
): LanguageOutcomeMix[] {
  const byLanguage = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const language = String(row.language ?? "").trim();
    const outcome = String(row.outcome ?? "").trim();
    if (!language || !outcome) continue;
    const counts = byLanguage.get(language) ?? new Map<string, number>();
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    byLanguage.set(language, counts);
  }

  return [...byLanguage.entries()]
    .map(([label, counts]) => ({
      label,
      total: [...counts.values()].reduce((a, b) => a + b, 0),
      counts: Object.fromEntries(counts),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, topN);
}
