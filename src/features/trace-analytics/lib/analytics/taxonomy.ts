/**
 * GNW / Zeno prompt taxonomy — deterministic rule tagger.
 *
 * A faithful TypeScript port of the Python reference tagger
 * (`skillz/projects/trace-analysis/taxonomy/src/tag_prompts.py`, v2.1). The
 * Python file remains the source of truth for the vocabulary and rules; this
 * port exists so the trace-analytics dashboard can classify prompts entirely
 * client-side (no network, no LLM) from the trace rows it already holds.
 *
 * Keep the two in sync: the constants block below mirrors the Python constants
 * near-verbatim. If a category or rule changes upstream, update it here too and
 * re-run the unit tests. See docs/taxonomy_v2.md for what the categories mean.
 *
 * Axes (per turn):
 *   - flag           cleaning segment (organic / templated_analyse /
 *                    internal_test / junk_test / system_injected / null)
 *   - turnRole       what the turn is doing (new_query, follow_up_refine, ...)
 *   - continuation   in-session behaviour (opening, refinement, selection, ...)
 *   - intent         analytical goal for substantive turns, else not_applicable
 *   - topics         pipe-delimited fine tags (+ topicsInherited flag)
 *   - topicCoarse    pipe-delimited coarse rollup
 *   - complexity     0-10 constraint count (null for empty prompts); cxBand
 *   - lang*          system value, independent detection, reconciled final
 *
 * Language note: unlike the Python (which uses `langdetect`), this port reuses
 * the dashboard's existing franc-based detector (`detectPromptLanguage`) so we
 * add no dependency. franc and langdetect differ on short/ambiguous text, so
 * the reconciliation numbers will not byte-match the Python judged sample; the
 * reconciliation *logic* (system-preferred, detection backfills blanks,
 * disagreements flagged) is identical.
 */

import type { TraceRow } from "../../model/types";
import { detectPromptLanguage } from "./language";

// --------------------------------------------------------------------------- #
// Constants: taxonomy vocabulary (mirror of tag_prompts.py)
// --------------------------------------------------------------------------- #

const JUNK = new Set([
  "test",
  "dsfghjkhjsdgfhjrertyuiloiuywertyui",
  "dsdssds",
  "dsadsdsdsffddf",
  "gffgfg",
  "dafgdfdsff",
]);

const CONFIRM = new Set([
  "yes",
  "no",
  "done",
  "sure",
  "ok",
  "okay",
  "please do",
  "lets go",
  "let's go",
  "yeah",
  "yep",
  "si",
  "sí",
  "haz el analisis",
  "alright",
  "3",
]);

/**
 * Fine topic tag -> matching regex, applied to the lowercased prompt. Insertion
 * order is preserved so multi-tag output lists tags in the same order as the
 * Python dict.
 */
const TOPIC: ReadonlyArray<readonly [string, RegExp]> = [
  ["fire", /fire|wildfire|burn|veld fire/],
  [
    "deforestation",
    /deforest|forest loss|tree cover loss|\btcl\b|tree loss|pérdida de cobertura|perdida de cobertura|perdida de bosque|pérdida de bosque|deforestaci|pérdida forestal|perdida forestal|desmatamento/,
  ],
  [
    "forest_status",
    /tree cover\b|canopy|primary (rain)?forest|intact forest|forest extent|bosque|floresta|cobertura forestal|covered (by|in) trees|tree species|type of trees/,
  ],
  [
    "natural_lands",
    /natural land|natural\/semi-natural|natural ecosystem|semi-natural/,
  ],
  ["land_cover", /land cover|land use|cropland|land conversion|converted to/],
  ["carbon", /carbon|emission|flux/],
  ["biodiversity", /biodiversity|species|endangered|wildlife|flora/],
  [
    "agriculture",
    /crop|agricultur|cocoa|palm|shrimp|aquaculture|pineapple|tea vs|coffee/,
  ],
  ["grasslands", /grassland/],
  ["water_wetlands", /mangrove|wetland|peatland|lagoon|\bbasin\b|cuenca/],
  ["urban", /\burban\b|urban expansion/],
  ["mining", /mining|\bmine\b/],
  [
    "protected_areas",
    /protected area|national park|reserva|reserve|world heritage|áreas protegidas|areas protegidas/,
  ],
  [
    "alerts",
    /alert|dist-alert|\baid\b|alerta|disturb|disaster|perturbaci|perturba/,
  ],
  ["restoration", /restoration|restore|reforest/],
  ["climate", /temperature|climate|socioeconomic/],
  ["indigenous_lands", /indigenous|comunidad|nativa|matses|matsés|ejido/],
  // v2.1: added from LLM topic discovery — users ask about the satellite
  // basemap itself (its date, clarity, availability).
  [
    "satellite_imagery",
    /satellite imag|satellite-observ|\bimagery\b|satellite picture|clear (satellite )?imag/,
  ],
];

/** Fine tag -> coarse rollup bucket. */
const COARSE: Readonly<Record<string, string>> = {
  deforestation: "Forest & tree cover",
  forest_status: "Forest & tree cover",
  fire: "Fire",
  alerts: "Alerts & disturbance",
  land_cover: "Land & agriculture",
  agriculture: "Land & agriculture",
  natural_lands: "Land & agriculture",
  grasslands: "Land & agriculture",
  carbon: "Carbon & climate",
  climate: "Carbon & climate",
  biodiversity: "Biodiversity & conservation",
  protected_areas: "Biodiversity & conservation",
  restoration: "Biodiversity & conservation",
  indigenous_lands: "Biodiversity & conservation",
  water_wetlands: "Water & wetlands",
  urban: "Built & extractive",
  mining: "Built & extractive",
  satellite_imagery: "Satellite imagery",
  unclassified: "Unclassified",
};

/**
 * Turn roles that carry no analytical intent — their intent is always
 * `not_applicable`. Part of the public vocabulary; `classifyTurn` returns
 * `NA_LABEL` on each of these branches directly.
 */
export const NO_INTENT_ROLES = new Set([
  "confirmation_selection",
  "meta_platform",
  "report_action",
  "insight_operation",
  "junk_test",
  "system_injected",
  "empty_null",
]);

/**
 * Turn roles that continue the current analysis, so a topic-less one inherits
 * the session's most-recent literal topic (v2.1). Deliberately excludes
 * new_query: a topic-less new question may be a genuinely new subject.
 */
const INHERIT_ROLES = new Set([
  "follow_up_refine",
  "insight_operation",
  "dataset_disambiguation",
]);

/**
 * The 11 substantive intents. `comparison` replaces the overlapping
 * `ranking`+`comparative` pair; `spatial` is view-only (v2.1).
 */
export const INTENT_LABELS: readonly string[] = [
  "quantification",
  "trend",
  "monitoring",
  "spatial",
  "causal",
  "comparison",
  "risk",
  "feasibility",
  "conceptual",
  "identification",
  "other",
];

const INTENT_LABEL_SET = new Set(INTENT_LABELS);

/**
 * Sentinel for "no analytical intent". Kept as a full word (not the short code)
 * to match the Python, where it must survive a pandas CSV round-trip.
 */
export const NA_LABEL = "not_applicable";

export const UNCLASSIFIED = "unclassified";

/** Undetermined language. */
const UND = "und";

export type CxBand = "minimal" | "low" | "moderate" | "high" | typeof NA_LABEL;
export type LangAgreement =
  | "agree"
  | "disagree"
  | "detected_only"
  | "system_only"
  | "none";

/** All tags a single turn carries. `row` is kept for downstream joins. */
export interface TaggedTrace {
  readonly row: TraceRow;
  readonly turnPos: number;
  readonly flag: string;
  readonly turnRole: string;
  readonly continuation: string;
  readonly intent: string;
  readonly topics: string;
  readonly topicsInherited: boolean;
  readonly topicCoarse: string;
  readonly complexity: number | null;
  readonly cxBand: CxBand;
  readonly langSystem: string;
  readonly langDetected: string;
  readonly langSession: string;
  readonly langFinal: string;
  readonly langAgreement: LangAgreement;
}

// --------------------------------------------------------------------------- #
// Helpers
// --------------------------------------------------------------------------- #

function norm(prompt: string | null | undefined): string {
  return (prompt ?? "").trim().toLowerCase();
}

function isEmptyPrompt(prompt: string | null | undefined): boolean {
  return !prompt || prompt.trim() === "";
}

// --------------------------------------------------------------------------- #
// flag (cleaning segment)
// --------------------------------------------------------------------------- #

export function classifyFlag(prompt: string | null | undefined): string {
  if (isEmptyPrompt(prompt)) return "null";
  const s = norm(prompt);
  if (JUNK.has(s)) return "junk_test";
  // Consonant soup: a single long token with almost no vowels is gibberish.
  const letters = s.replace(/[^a-z]/g, "");
  if (s.length >= 5 && !s.includes(" ") && letters) {
    const vowels = [...letters].filter((c) => "aeiou".includes(c)).length;
    if (vowels / letters.length < 0.2) return "junk_test";
  }
  if (
    s.startsWith("pick a dataset") ||
    s.startsWith("choose a dataset") ||
    s.includes("best answer the question")
  ) {
    return "internal_test";
  }
  if (
    s.includes("user performed ui action") ||
    s.includes("acknowledge the updates")
  ) {
    return "system_injected";
  }
  if (
    /^analy[sz]e /.test(s) &&
    (s.includes(" in ") || /^analy[sz]e [a-z ]+$/.test(s))
  ) {
    return "templated_analyse";
  }
  return "organic";
}

// --------------------------------------------------------------------------- #
// topics
// --------------------------------------------------------------------------- #

export function classifyTopics(prompt: string | null | undefined): string {
  if (isEmptyPrompt(prompt)) return UNCLASSIFIED;
  const s = norm(prompt);
  const tags = TOPIC.filter(([, rx]) => rx.test(s)).map(([k]) => k);
  return tags.length ? tags.join("|") : UNCLASSIFIED;
}

export function coarseRollup(topics: string): string {
  const seen: string[] = [];
  for (const t of topics.split("|")) {
    const c = COARSE[t] ?? "Unclassified";
    if (!seen.includes(c)) seen.push(c);
  }
  return seen.join("|");
}

// --------------------------------------------------------------------------- #
// intent
// --------------------------------------------------------------------------- #

function baseIntent(s: string): string {
  // comparison = explicit A-vs-B OR superlative/rank over a set (v2.1 merge).
  if (
    /(compare|comparar|versus| vs |vs\.|more .* than|between .+ and .+|how does .* compare|compara)/.test(
      s
    )
  ) {
    return "comparison";
  }
  if (
    /(top \d|top three|the most|biggest|largest|highest|which .*(had|has|lost) (the )?most|prioriti|más pérdida|mayor pérdida)/.test(
      s
    )
  ) {
    return "comparison";
  }
  if (
    /(trend|over the (last|past)|since \d{4}|between \d{4}|over time|tendencia|changes in .* (over|between)|past decade|last \d+ (years|months)|\d{4}\s*[-–to]{1,3}\s*\d{4}|\d{4}-\d{4})/.test(
      s
    )
  ) {
    return "trend";
  }
  if (
    /(why|driver|drivers|caused by|due to|causes|cause of|led to|linked to|dominant driver)/.test(
      s
    )
  ) {
    return "causal";
  }
  if (
    /(alert|recent|latest|last month|this month|disturb|near-real|what.*happening|disaster|alerta|perturbaci|\baid\b|fires in )/.test(
      s
    )
  ) {
    return "monitoring";
  }
  if (
    /(how much|how many|what percentage|percent|%|what area|hectares|area of|total area|covered by trees|perdida de cobertura|cuanto|cuánto|net (carbon )?emissions)/.test(
      s
    )
  ) {
    return "quantification";
  }
  if (/(at risk|vulnerab|environmental risk)/.test(s)) return "risk";
  if (
    /(should i prioriti|restoration|restore|protect|carbon credit|viabilit)/.test(
      s
    )
  ) {
    return "feasibility";
  }
  if (
    /(how does .* impact|correlation|relationship between|socioeconomic)/.test(
      s
    )
  ) {
    return "conceptual";
  }
  if (/(what is this|describe|type of|what data|what year|identif)/.test(s)) {
    return "identification";
  }
  // spatial is VIEW-ONLY (v2.1): map / navigate / where-is, with no metric.
  if (
    /(\bmap\b|where (is|are|can)|\bwhere\b.*\?|zoom|go to|navigate|pan to|give me a map|muestra el mapa|mostrar el mapa|dónde)/.test(
      s
    )
  ) {
    return "spatial";
  }
  return "other";
}

/** Fallback for terse prompts that carry a topic but no explicit verb. */
function inferShorthand(s: string, topics: string): string {
  const hasTopic = topics !== UNCLASSIFIED;
  const yrRange =
    /(\d{4}\s*[-–]\s*\d{4}|\d{4} to \d{4}|since \d{4}|last \d+ (year|month)|past .*(year|decade))/.test(
      s
    );
  const yrSingle = /\b(19|20)\d{2}\b/.test(s);
  const metric = /(loss|cover|area|%|hectares|extent|emissions)/.test(s);
  if (/\b(vs|versus)\b| vs\.|between .+ and |(most|biggest|top)/.test(s)) {
    return "comparison";
  }
  if (/(fire|alert|disturb|disaster|latest|recent)/.test(s))
    return "monitoring";
  if (yrRange) return "trend";
  if (metric || yrSingle) return "quantification";
  if (hasTopic) return "spatial";
  return "other";
}

export function intentOf(s: string, topics: string): string {
  const intent = baseIntent(s);
  return intent === "other" ? inferShorthand(s, topics) : intent;
}

// --------------------------------------------------------------------------- #
// turn role / continuation / intent
// --------------------------------------------------------------------------- #

interface TurnResult {
  readonly turnRole: string;
  readonly continuation: string;
  readonly intent: string;
}

export function classifyTurn(
  prompt: string | null | undefined,
  flag: string,
  turnPos: number,
  topics: string
): TurnResult {
  if (isEmptyPrompt(prompt)) {
    return {
      turnRole: "empty_null",
      continuation: "opening",
      intent: NA_LABEL,
    };
  }
  const s = norm(prompt);
  const first = turnPos === 0;

  if (flag === "junk_test") {
    return { turnRole: "junk_test", continuation: "other", intent: NA_LABEL };
  }
  if (flag === "system_injected") {
    return {
      turnRole: "system_injected",
      continuation: "other",
      intent: NA_LABEL,
    };
  }
  if (flag === "templated_analyse") {
    return {
      turnRole: "templated_command",
      continuation: first ? "opening" : "new_question",
      intent: intentOf(s, topics),
    };
  }

  if (
    /(what datasets|what tools|what layers|what data (do|you)|do you have.*(dataset|layer|data)|are you aware|what year is|what is the area|access to (limites|geographic)|what are some data)/.test(
      s
    ) ||
    s === "hey man" ||
    s === "hey"
  ) {
    return {
      turnRole: "meta_platform",
      continuation: "meta",
      intent: NA_LABEL,
    };
  }
  if (
    s.includes("this insight") ||
    /^(explain|simplify|give me a one-sentence tl;dr|tl;dr)/.test(s)
  ) {
    // v2.1: operating on an existing insight is not an analytical goal.
    return {
      turnRole: "insight_operation",
      continuation: first ? "opening" : "refinement",
      intent: NA_LABEL,
    };
  }
  if (
    /(pin (it |this )?into|create a report|for my report|into my report)/.test(
      s
    )
  ) {
    return {
      turnRole: "report_action",
      continuation: "refinement",
      intent: NA_LABEL,
    };
  }
  if (/^(go to|zoom to|zoom|navigate|pan to)\b/.test(s)) {
    return {
      turnRole: "ui_navigation",
      continuation: first ? "new_question" : "refinement",
      intent: "spatial",
    };
  }
  if (
    /(which dataset|what about that .*dataset|do you have the .*dataset)/.test(
      s
    )
  ) {
    return {
      turnRole: "dataset_disambiguation",
      continuation: first ? "opening" : "refinement",
      intent: intentOf(s, topics),
    };
  }

  // bare confirmation / selection
  if (
    CONFIRM.has(s) ||
    (!first &&
      s.split(/\s+/).length <= 2 &&
      !/(loss|cover|fire|alert|deforest|tcl)/.test(s))
  ) {
    return {
      turnRole: "confirmation_selection",
      continuation: "selection",
      intent: NA_LABEL,
    };
  }

  // refinement vs new question for later turns
  const referential =
    /\b(this|that|these|those|here|it|now|instead|as well|also)\b/.test(s);
  const modifier =
    /^(no,|no |also|and |now |just |can you (convert|add|show)|actually|sorry|rerun|the map|do not|don't|yeah actuslly|i like)/.test(
      s
    );
  const introducesPlace = /\b(in|en|de|del)\s+[a-z]/.test(s) && !referential;

  // v2.1: a bare correction/negation carrying no topic, year or metric is not
  // an analytical goal ("sorry I meant the bekaa valley", "no, do not use
  // drivers"). Any year or metric term keeps the analytical intent.
  const correction =
    /^(no|sorry|actually|do not|don'?t)\b/.test(s) &&
    topics === UNCLASSIFIED &&
    !/\b(19|20)\d{2}\b|\b(loss|cover|area|hectares|extent|emissions|percent)\b|%/.test(
      s
    );

  if (!first) {
    if ((referential || modifier) && !introducesPlace) {
      return {
        turnRole: "follow_up_refine",
        continuation: "refinement",
        intent: correction ? NA_LABEL : intentOf(s, topics),
      };
    }
    return {
      turnRole: "new_query",
      continuation: "new_question",
      intent: intentOf(s, topics),
    };
  }
  return {
    turnRole: "new_query",
    continuation: "opening",
    intent: intentOf(s, topics),
  };
}

// --------------------------------------------------------------------------- #
// complexity
// --------------------------------------------------------------------------- #

export function complexityScore(
  prompt: string | null | undefined
): number | null {
  if (isEmptyPrompt(prompt)) return null;
  const s = norm(prompt);
  const raw = String(prompt);
  let f = 0;
  // area specified: preposition + a capitalised place (raw text), or an
  // explicit reference to the current AOI. Matching on raw text stops bare
  // prepositions with no location from being credited.
  if (
    /\b(in|en|for|around|near|at|de|del|para|sobre)\s+[A-ZÁÉÍÓÚÜÑ]/.test(raw) ||
    /this (area|aoi)|\bhere\b/.test(s)
  ) {
    f += 1;
  }
  if (
    /(state|province|district|municipality|county|region|provincia|distrito|departamento|park|reserve|reserva|basin|cuenca|comunidad|nativa|highlands|valley|island|plateau|ejido|key biodiversity)/.test(
      s
    )
  ) {
    f += 1; // sub-national granularity
  }
  if (
    /(\b(19|20)\d{2}\b|last \d+ (year|month)|past (\d+ )?(year|decade|month)|since \d|between \d{4}|q[1-4]|quarter|summer|first half|second half|january|february|march|april|may|june|july|august|september|october|november|december|periodo)/.test(
      s
    )
  ) {
    f += 1; // temporal constraint
  }
  if (
    /(how much|how many|percentage|percent|%|hectares|\barea\b|total|net (carbon )?emissions|cuanto|cuánto)/.test(
      s
    )
  ) {
    f += 1; // metric / quantity
  }
  if (
    /(dataset|dist-alert|integrated alert|dominant driver|high conf|confidence|canopy|natural land|land cover|grassland|carbon flux|tree cover)/.test(
      s
    )
  ) {
    f += 1; // dataset / layer named
  }
  if (
    /(\d+%|canopy density|high confidence|crop management|due to (fires|logging|settlement)|by driver|multiple systems|natural events vs)/.test(
      s
    )
  ) {
    f += 1; // filter condition
  }
  if (
    /(compare|versus| vs |between .+ and .+|more .* than|comparar|compara)/.test(
      s
    )
  ) {
    f += 1; // comparison
  }
  if (
    /(top \d|the most|biggest|largest|by year|by driver|by region|per region|breakdown|desglose|each year|separately)/.test(
      s
    )
  ) {
    f += 1; // aggregation / superlative
  }
  if (
    /(correlation|true or false|caught by multiple|overlap|combine|rerun|both .* and|convert)/.test(
      s
    )
  ) {
    f += 1; // multi-step reasoning
  }
  if (/(sq km|square km|chart|graph|tl;dr|one-sentence|simplify|pin)/.test(s)) {
    f += 1; // output / format operation
  }
  return f;
}

export function complexityBand(c: number | null): CxBand {
  if (c === null) return NA_LABEL;
  if (c <= 1) return "minimal";
  if (c <= 3) return "low";
  if (c <= 5) return "moderate";
  return "high";
}

// --------------------------------------------------------------------------- #
// language reconciliation
// --------------------------------------------------------------------------- #

/**
 * Reconcile a system (API) language value against an independent detection.
 * System-preferred, because the system had whole-session context a short turn
 * lacks; detection backfills blanks; disagreements are kept but flagged.
 */
export function reconcileLang(
  system: string | null | undefined,
  detected: string | null | undefined
): { langFinal: string; langAgreement: LangAgreement } {
  const sys = (system ?? "").trim().toLowerCase();
  const det = (detected ?? UND).trim().toLowerCase();
  const hasSys = Boolean(sys);
  const hasDet = det !== UND;

  if (!hasDet) {
    return hasSys
      ? { langFinal: sys, langAgreement: "system_only" }
      : { langFinal: UND, langAgreement: "none" };
  }
  if (!hasSys) return { langFinal: det, langAgreement: "detected_only" };
  return sys === det
    ? { langFinal: sys, langAgreement: "agree" }
    : { langFinal: sys, langAgreement: "disagree" };
}

// --------------------------------------------------------------------------- #
// tagTraces — the DataFrame-level entry point (mirrors tag_dataframe)
// --------------------------------------------------------------------------- #

/** Milliseconds for sorting; null/unparseable timestamps sort last. */
function tsMillis(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Tag every row on all axes, returned in the SAME order as the input. Rows are
 * grouped by session and ordered by timestamp internally to compute turn
 * position, topic inheritance, and session-level language, exactly as the
 * Python `tag_dataframe` does. A null/blank sessionId is treated as its own
 * singleton session (never lumped together).
 */
export function tagTraces(rows: readonly TraceRow[]): TaggedTrace[] {
  // Group original indices by session key.
  const groups = new Map<string, number[]>();
  rows.forEach((row, i) => {
    const key =
      row.sessionId && row.sessionId.trim() ? row.sessionId : `__row_${i}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(i);
    else groups.set(key, [i]);
  });

  const out = new Array<TaggedTrace>(rows.length);

  for (const indices of groups.values()) {
    // Stable sort by timestamp ascending (nulls last), preserving input order
    // on ties — Array.prototype.sort is stable in modern engines.
    const ordered = [...indices].sort(
      (a, b) => tsMillis(rows[a].timestamp) - tsMillis(rows[b].timestamp)
    );

    // Session-level language detection over the concatenated prompts, so short
    // turns ("yes", "Cusco") inherit a decision the session can make.
    const sessionText = ordered.map((i) => rows[i].prompt ?? "").join(" ");
    const langSession = detectPromptLanguage(sessionText) ?? UND;

    // First pass: flag, literal topics, turn classification, complexity, lang.
    const literalTopics = new Array<string>(ordered.length);
    const roles = new Array<string>(ordered.length);
    const partial = new Array<TaggedTrace>(ordered.length);

    ordered.forEach((rowIndex, pos) => {
      const row = rows[rowIndex];
      const flag = classifyFlag(row.prompt);
      const topics = classifyTopics(row.prompt);
      const turn = classifyTurn(row.prompt, flag, pos, topics);
      const complexity = complexityScore(row.prompt);

      const langSystem = (row.language ?? "").trim().toLowerCase();
      const langDetected = detectPromptLanguage(row.prompt) ?? UND;
      // Effective detection prefers the turn, then falls back to its session.
      const detEff = langDetected !== UND ? langDetected : langSession;
      const { langFinal, langAgreement } = reconcileLang(langSystem, detEff);

      literalTopics[pos] = topics;
      roles[pos] = turn.turnRole;
      partial[pos] = {
        row,
        turnPos: pos,
        flag,
        turnRole: turn.turnRole,
        continuation: turn.continuation,
        intent: turn.intent,
        topics,
        topicsInherited: false,
        topicCoarse: coarseRollup(topics),
        complexity,
        cxBand: complexityBand(complexity),
        langSystem,
        langDetected,
        langSession,
        langFinal,
        langAgreement,
      };
    });

    // Second pass: topic inheritance. Carry the most-recent literal topic onto
    // a topic-less continuation turn. `last` is only ever a literal topic, so
    // nothing chains off a guess.
    let last: string | null = null;
    ordered.forEach((rowIndex, pos) => {
      const t = literalTopics[pos];
      const p = partial[pos];
      if (
        p.flag === "organic" &&
        t === UNCLASSIFIED &&
        INHERIT_ROLES.has(roles[pos]) &&
        last
      ) {
        out[rowIndex] = {
          ...p,
          topics: last,
          topicsInherited: true,
          topicCoarse: coarseRollup(last),
        };
      } else {
        out[rowIndex] = p;
        if (t !== UNCLASSIFIED) last = t;
      }
    });
  }

  return out;
}

// --------------------------------------------------------------------------- #
// Aggregation helpers for the dashboard
// --------------------------------------------------------------------------- #

export interface AxisCount {
  readonly label: string;
  readonly count: number;
}

function organicOnly(tagged: readonly TaggedTrace[]): TaggedTrace[] {
  return tagged.filter((t) => t.flag === "organic");
}

/** Generic descending count of a string field, optionally organic-only. */
function countBy(
  tagged: readonly TaggedTrace[],
  pick: (t: TaggedTrace) => string
): AxisCount[] {
  const counts = new Map<string, number>();
  for (const t of tagged) counts.set(pick(t), (counts.get(pick(t)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** flag distribution across ALL traffic (this is the cleaning axis itself). */
export function flagDistribution(tagged: readonly TaggedTrace[]): AxisCount[] {
  return countBy(tagged, (t) => t.flag);
}

/** intent distribution over substantive turns only. */
export function intentDistribution(
  tagged: readonly TaggedTrace[],
  opts: { readonly organic?: boolean } = {}
): AxisCount[] {
  const pool = opts.organic ? organicOnly(tagged) : tagged;
  return countBy(
    pool.filter((t) => INTENT_LABEL_SET.has(t.intent)),
    (t) => t.intent
  );
}

export function turnRoleDistribution(
  tagged: readonly TaggedTrace[],
  opts: { readonly organic?: boolean } = {}
): AxisCount[] {
  const pool = opts.organic ? organicOnly(tagged) : tagged;
  return countBy(pool, (t) => t.turnRole);
}

/** continuation distribution over in-session turns (turnPos > 0). */
export function continuationDistribution(
  tagged: readonly TaggedTrace[],
  opts: { readonly organic?: boolean } = {}
): AxisCount[] {
  const pool = (opts.organic ? organicOnly(tagged) : tagged).filter(
    (t) => t.turnPos > 0
  );
  return countBy(pool, (t) => t.continuation);
}

/** Coarse topic occurrences (multi-tag, so total may exceed row count). */
export function topicCoarseDistribution(
  tagged: readonly TaggedTrace[],
  opts: { readonly organic?: boolean } = {}
): AxisCount[] {
  const pool = opts.organic ? organicOnly(tagged) : tagged;
  const counts = new Map<string, number>();
  for (const t of pool) {
    for (const c of t.topicCoarse.split("|")) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const CX_BAND_ORDER: readonly CxBand[] = ["minimal", "low", "moderate", "high"];

export interface ComplexitySummary {
  readonly bands: AxisCount[];
  /** Mean over scored (non-empty) prompts; null when there are none. */
  readonly mean: number | null;
  readonly inheritedTopics: number;
}

export function complexitySummary(
  tagged: readonly TaggedTrace[],
  opts: { readonly organic?: boolean } = {}
): ComplexitySummary {
  const pool = opts.organic ? organicOnly(tagged) : tagged;
  const bandCounts = new Map<string, number>();
  const scored: number[] = [];
  let inherited = 0;
  for (const t of pool) {
    if (t.cxBand !== NA_LABEL) {
      bandCounts.set(t.cxBand, (bandCounts.get(t.cxBand) ?? 0) + 1);
    }
    if (t.complexity !== null) scored.push(t.complexity);
    if (t.topicsInherited) inherited += 1;
  }
  const bands = CX_BAND_ORDER.filter((b) => bandCounts.has(b)).map((b) => ({
    label: b,
    count: bandCounts.get(b) ?? 0,
  }));
  const mean = scored.length
    ? scored.reduce((a, b) => a + b, 0) / scored.length
    : null;
  return { bands, mean, inheritedTopics: inherited };
}

export interface LanguageReconciliation {
  /** Final reconciled language counts (organic), largest first. */
  readonly finalCounts: AxisCount[];
  /** Raw API/system language counts (organic), largest first. */
  readonly systemCounts: AxisCount[];
  /** Agreement breakdown across ALL traffic. */
  readonly agreement: AxisCount[];
  readonly backfilled: number;
  readonly disagreements: number;
}

export function languageReconciliation(
  tagged: readonly TaggedTrace[]
): LanguageReconciliation {
  const org = organicOnly(tagged);
  const finalCounts = countBy(
    org.filter((t) => t.langFinal && t.langFinal !== UND),
    (t) => t.langFinal
  );
  const systemCounts = countBy(
    org.filter((t) => t.langSystem),
    (t) => t.langSystem
  );
  const agreement = countBy(tagged, (t) => t.langAgreement);
  const backfilled = tagged.filter(
    (t) => t.langAgreement === "detected_only"
  ).length;
  const disagreements = tagged.filter(
    (t) => t.langAgreement === "disagree"
  ).length;
  return { finalCounts, systemCounts, agreement, backfilled, disagreements };
}

/**
 * A snake_case / lower-case taxonomy code as a readable label, e.g.
 * "follow_up_refine" -> "Follow up refine". Coarse topic labels (already
 * Title Case) pass through unchanged.
 */
export function prettyLabel(label: string): string {
  const s = label.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --------------------------------------------------------------------------- #
// Outcome mix by taxonomy dimension
// --------------------------------------------------------------------------- #

/** Taxonomy dimensions the outcome mix can be broken down by. */
export type OutcomeMixDimension = "topic" | "intent" | "language" | "turn";

export interface OutcomeMix {
  /** Dimension value: a coarse topic, an intent, a language code, or a role. */
  readonly label: string;
  readonly total: number;
  /** Outcome key (whatever `outcomeOf` returns) -> trace count. */
  readonly counts: Readonly<Record<string, number>>;
}

export interface OutcomeMixOptions {
  readonly topN?: number;
  /**
   * Resolves each turn's outcome key. Defaults to the raw server
   * `row.outcome`; pass a refined-outcome accessor to break down by the
   * refined taxonomy without coupling this module to it. Return null/undefined
   * to skip the turn.
   */
  readonly outcomeOf?: (t: TaggedTrace) => string | null | undefined;
}

/**
 * Outcome composition for each value of a taxonomy dimension, largest cohort
 * first, capped at `topN`. Counts are keyed by whatever `outcomeOf` returns
 * (raw server outcome code by default) so the caller owns label/colour mapping;
 * the API outcome is never re-derived here.
 *
 * - topic: a turn counts under EACH of its coarse topics (topics are multi-tag).
 * - intent: only substantive turns (not_applicable is skipped).
 * - language: uses the reconciled `langFinal`; undetermined turns are skipped.
 * - turn: the turn role / category (every role, including non-analytical ones).
 *
 * Turns with no resolved outcome are skipped in every mode.
 */
/**
 * The dimension value(s) a turn belongs to, or null when it is outside the
 * dimension's population (non-substantive for intent, undetermined language).
 * Single source of truth for both the mix aggregation and the drill-down, so
 * "view these traces" always matches what the chart counted.
 */
export function dimensionKeys(
  t: TaggedTrace,
  dimension: OutcomeMixDimension
): string[] | null {
  if (dimension === "topic") return t.topicCoarse.split("|").filter(Boolean);
  if (dimension === "intent") {
    return INTENT_LABEL_SET.has(t.intent) ? [t.intent] : null;
  }
  if (dimension === "turn") return [t.turnRole];
  return t.langFinal && t.langFinal !== UND ? [t.langFinal] : null;
}

/** All tagged turns whose dimension value includes `value`. */
export function tracesForDimensionValue(
  tagged: readonly TaggedTrace[],
  dimension: OutcomeMixDimension,
  value: string
): TaggedTrace[] {
  return tagged.filter((t) =>
    (dimensionKeys(t, dimension) ?? []).includes(value)
  );
}

export function outcomeMixByDimension(
  tagged: readonly TaggedTrace[],
  dimension: OutcomeMixDimension,
  opts: OutcomeMixOptions = {}
): OutcomeMix[] {
  const { topN = 8, outcomeOf } = opts;
  const byKey = new Map<string, Map<string, number>>();
  for (const t of tagged) {
    const outcome = String(
      (outcomeOf ? outcomeOf(t) : t.row.outcome) ?? ""
    ).trim();
    if (!outcome) continue;

    const keys = dimensionKeys(t, dimension);
    if (!keys) continue;

    for (const key of keys) {
      const counts = byKey.get(key) ?? new Map<string, number>();
      counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
      byKey.set(key, counts);
    }
  }

  return [...byKey.entries()]
    .map(([label, counts]) => ({
      label,
      total: [...counts.values()].reduce((a, b) => a + b, 0),
      counts: Object.fromEntries(counts),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, topN);
}
