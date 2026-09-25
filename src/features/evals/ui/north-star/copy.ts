/**
 * Words for the North Star view, carried over from the Zeno North Star v2
 * wireframe (claude.ai artifact 705ba471) and adjusted where the harness
 * differs. Static copy lives in constants; sentences that depend on data
 * are pure builders so they can be tested.
 */

import type { BucketName, QueryTypeDef } from "../../model/config";
import type { HeadlineSource } from "../../model/benchmark";
import type { IntentCell } from "../../lib/intent-matrix";
import type { Marker } from "../../lib/annotations";

/** A run of text; `strong` segments render bold. */
export interface Segment {
  text: string;
  strong?: boolean;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-09-01T20:49:46Z" -> "1 Sep 2026" (no locale surprises). */
export function fmtDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

const pct = (rate: number, digits = 1) => `${(rate * 100).toFixed(digits)}%`;

// ---------------------------------------------------------------- hero

export const NORTH_STAR_EYEBROW = "The North Star";

export const NORTH_STAR_EXPLAIN =
  "Complete accuracy: right task, right data, correct sums, faithful wording, working result. One miss and the answer counts as wrong.";

export function claimSentence(rate: number): string {
  return `When a user asks a question, the system responds with complete accuracy ${pct(rate)} of the time.`;
}

export interface ScaleLine {
  badge: string;
  detail: string;
  counts: string;
  method: string;
}

export function scaleLine({
  source,
  questions,
  datasets,
  lastRun,
  trials,
  casesetVersion,
}: {
  source: HeadlineSource;
  questions: number;
  datasets: number;
  lastRun: string;
  trials: number;
  casesetVersion: string;
}): ScaleLine {
  const counts = `${questions} questions · ${datasets} datasets · last run ${fmtDay(lastRun)}`;
  const method =
    trials > 1
      ? `${trials} attempts each, majority verdict`
      : `${trials} attempt each`;
  if (source.kind === "benchmark") {
    return {
      badge: `Benchmark ${source.version}`,
      detail: `frozen ${fmtDay(source.frozen)} · re-versioned annually`,
      counts,
      method,
    };
  }
  return {
    badge: "CHALLENGE set",
    detail: `caseset ${casesetVersion.slice(0, 7)} · not yet frozen: the annual BENCHMARK will be a sample of this set`,
    counts,
    method,
  };
}

export const TREND_TITLE = "Complete accuracy over eval runs";

export const TREND_HINT =
  "Ringed points mark changes: select one for the story. Dips are marked as faithfully as rises.";

// ---------------------------------------------------------------- story

export const STORY = {
  eyebrow: "Before the detail",
  title: "The question we ask ourselves",
  lead: [
    { text: "One question drives every number here: " },
    {
      text: "when someone asks, how often is the reply completely accurate?",
      strong: true,
    },
    { text: " Here is what one answer has to get right." },
  ] satisfies Segment[],
  exampleLabel: "A worked example",
  exampleQuestion:
    "How much tree cover did Pará, Brazil lose between 2019 and 2023?",
  pull: "Either everything a user could rely on is right, or the answer does not count as right.",
} as const;

// ---------------------------------------------------------------- checks

export interface DimensionCopy {
  label: string;
  /** The question the check answers (pipeline card + methodology). */
  question: string;
  /** What this step means in the worked example. */
  example: string;
}

export const DIMENSION_COPY: Readonly<Record<BucketName, DimensionCopy>> = {
  scope: {
    label: "Scope",
    question:
      "Does the system choose the right thing to do, given the user prompt?",
    example:
      "See that this deserves a data answer, and that Pará means the Brazilian state. Too vague to answer safely? Ask, don't guess.",
  },
  retrieval: {
    label: "Retrieval",
    question:
      "Can it extract the relevant information: right place, dataset, settings, dates?",
    example:
      "Fetch the right dataset, the right boundary, exactly 2019 to 2023.",
  },
  analysis: {
    label: "Analysis",
    question:
      "Can it run the right analysis on what it extracted, with correct sums?",
    example: "Do the sums correctly: totals, yearly figures, units.",
  },
  explanation: {
    label: "Explanation",
    question:
      "Does it represent the data correctly, and surface the caveats and gotchas?",
    example: "Say what the data says, caveats included, nothing invented.",
  },
  output: {
    label: "Output",
    question:
      "Does it select the right kind of output (chart, layer, table) for a meaningful answer?",
    example: "Render the right result: map and chart, correctly labelled.",
  },
};

export const CHECKS_SECTION = {
  eyebrow: "Where answers can go wrong",
  title: "Five checks, in the order an answer is made",
  sub: "A failure anywhere in the chain misleads. Each check carries its own accuracy and trend.",
  unmeasured: "Not measured yet",
} as const;

// ---------------------------------------------------------------- funnel

export const FUNNEL_TITLE =
  "The compound effect: 100 prompts through all five checks";

export function funnelCaption({
  survivorsPer100,
  population,
  headline,
}: {
  survivorsPer100: number;
  population: "full-pipeline" | "all-measured";
  headline: number;
}): Segment[] {
  const lead: Segment = {
    text: `Of 100 prompts, about ${Math.round(survivorsPer100)} come out fully right.`,
    strong: true,
  };
  if (population === "full-pipeline") {
    return [
      lead,
      {
        text: ` Counted only over prompts that exercise all five checks; many need fewer (no chart, no data pull), which is why the headline reads ${pct(headline)}.`,
      },
    ];
  }
  return [
    lead,
    {
      text: " Too few questions exercise all five checks yet, so this flows every measured question through the stages. A stage a question does not exercise cannot fail it, so read this as where failures land, not as a full-pipeline survival rate.",
    },
  ];
}

// ---------------------------------------------------------------- matrix

export const MATRIX_SECTION = {
  eyebrow: "The deepest layer",
  title: "What people ask, about which data",
  sub: "Columns: datasets. Rows: what users are trying to do. Select a cell for the plain-language read.",
  question:
    "If a user asks a question shaped like this about this dataset, how likely is it they'll be misled?",
  legendPerf: "Performance, low to high",
  legendThin: "Faded = thin coverage, an early signal",
  legendNone: "Hatched = no evals yet, we don't know",
} as const;

const INTENT_PHRASE: Readonly<Record<string, string>> = {
  quantification: "direct questions quantifying",
  comparison: "questions comparing places or periods using",
  trend: "questions about change over time in",
  monitoring: "requests to watch for change in",
  identification: "questions identifying what is at a place using",
  risk: "risk and exposure questions over",
  causal: "questions about the causes behind",
  feasibility: "feasibility questions grounded in",
  spatial: "place-finding requests, whatever the dataset,",
  refusal: "questions the system should decline, whatever the dataset,",
  conceptual: "questions about definitions and methods, whatever the dataset,",
};

/** Five-step performance ramp: 1 (worst) .. 5 (best). */
export function perfBand(rate: number): 1 | 2 | 3 | 4 | 5 {
  if (rate < 0.6) return 1;
  if (rate < 0.7) return 2;
  if (rate < 0.8) return 3;
  if (rate < 0.9) return 4;
  return 5;
}

function misledVerdict(rate: number): string {
  if (rate >= 0.9) return "rarely misled";
  if (rate >= 0.75) return "occasionally misled";
  return "misled too often, and this cell is a priority";
}

export function describeCell({
  intent,
  datasetLabel,
  cell,
}: {
  intent: QueryTypeDef;
  datasetLabel: string | null;
  cell: IntentCell;
}): Segment[] {
  const phrase =
    INTENT_PHRASE[intent.key] ?? `questions of type ${intent.label} about`;
  const subject: Segment[] = datasetLabel
    ? [{ text: `${phrase} ` }, { text: datasetLabel, strong: true }]
    : [{ text: phrase }];
  // Cross-cutting phrases already end in a comma.
  const pause = datasetLabel ? ", " : " ";
  if (cell.cases === 0) {
    return [
      { text: "For " },
      ...subject,
      { text: `${pause}we ` },
      { text: "don't know yet", strong: true },
      {
        text: ": no evals test this cell, so no score is claimed in either direction. It is on the coverage roadmap.",
      },
    ];
  }
  if (cell.rate === null) {
    return [
      { text: "For " },
      ...subject,
      {
        text: `${pause}${cell.cases} evals exist, but none has been scored in an eligible run yet.`,
      },
    ];
  }
  return [
    { text: "When users ask " },
    ...subject,
    { text: `${pause}the answer is completely accurate ` },
    { text: `${Math.round(cell.rate * 100)}% of the time`, strong: true },
    { text: `: a user here is ${misledVerdict(cell.rate)}.` },
  ];
}

// ---------------------------------------------------------------- markers

export interface MarkerNote {
  title: string;
  body: string;
  tone: "rise" | "dip" | "neutral";
}

export function markerNote(
  marker: Marker,
  point: { build: string; casesetVersion: string }
): MarkerNote {
  const parts: string[] = [];
  const kinds = new Set(marker.kinds);
  const points = marker.delta !== undefined ? Math.abs(marker.delta * 100) : 0;
  if (kinds.has("baseline")) {
    parts.push(
      "The first run in this series: the baseline every later point is compared against."
    );
  }
  if (kinds.has("rise")) {
    parts.push(
      `Rose ${points.toFixed(1)} points, clear of run-to-run noise (the likely ranges don't overlap).`
    );
  }
  if (kinds.has("dip")) {
    parts.push(
      `Dipped ${points.toFixed(1)} points, clear of run-to-run noise (the likely ranges don't overlap).`
    );
  }
  if (kinds.has("benchmark")) parts.push("The benchmark was re-versioned.");
  if (kinds.has("caseset")) {
    parts.push(
      `Question set changed (caseset ${point.casesetVersion.slice(0, 7)}): questions were added or edited, so part of the move may be the questions, not the system.`
    );
  }
  if (kinds.has("build")) parts.push(`New build: "${point.build}".`);
  const title = kinds.has("baseline")
    ? "Baseline"
    : kinds.has("dip")
      ? "Dip"
      : kinds.has("rise")
        ? "Rise"
        : "Change";
  const tone = kinds.has("dip")
    ? "dip"
    : kinds.has("rise")
      ? "rise"
      : "neutral";
  return { title, body: parts.join(" "), tone };
}

// ---------------------------------------------------------------- methodology

export interface MethodologyDimension {
  bucket: BucketName;
  measure: string;
  misleads: string;
  gaps: string;
}

export const METHODOLOGY = {
  eyebrow: "Methodology",
  title: "What we measure, and why",
  lead: "The dashboard reports one thing: how often an answer is completely accurate. This page explains the five dimensions behind that number: for each, what we check, why a failure there would mislead a user, and what we do not cover yet. Gaps live inside the dimension they belong to, because that is where they matter.",
  labels: {
    measure: "What we measure",
    misleads: "Why a failure misleads",
    gaps: "What we don't cover yet",
  },
  dimensions: [
    {
      bucket: "scope",
      measure:
        "Whether the system answers when it should answer, asks a clarifying question when the request is ambiguous, and declines gracefully when no safe answer exists, without substituting a plausible-looking guess.",
      misleads:
        "A scope failure is the most dangerous kind: a confident answer to the wrong question, or to a question that should not have been answered, reads exactly like a right answer.",
      gaps: "Refusal-shaped prompts (questions the system should decline) have no dedicated eval set yet; they are the next cross-cutting batch. Multi-turn scope drift, where a conversation slowly walks off-topic, is unmeasured.",
    },
    {
      bucket: "retrieval",
      measure:
        "Whether the right place was found on the map, the right dataset chosen, the right settings applied (thresholds, layers), and exactly the requested time period used. Place-finding is tested across easy, medium and deliberately hard prompts, including vague, ambiguous and multilingual names.",
      misleads:
        "Numbers computed flawlessly over the wrong place, dataset or years are confident numbers for the wrong thing, which is worse than no answer. Wrong-place substitution is our single most studied failure class.",
      gaps: "User-drawn custom areas are not yet in the eval set (they need seeded areas per test account); prompts naming places by coordinates or by concept (“the watersheds above the dam”) are covered only thinly.",
    },
    {
      bucket: "analysis",
      measure:
        "Whether the computed figures are internally consistent and match ground truth from the underlying data service: totals, yearly breakdowns, class values, units. The dedicated analysis checks are computed by code, not by a model's judgement.",
      misleads:
        "Analysis failures produce precise-looking numbers that are simply wrong, the classic spreadsheet error. A single one in a funder-facing figure would be costly, which is why the dedicated checks are deterministic.",
      gaps: "Derived statistics beyond the standard aggregations (percentages of subregions, densities) are spot-checked, not systematically enumerated. Cross-dataset arithmetic (combining two datasets in one answer) has no dedicated checks yet.",
    },
    {
      bucket: "explanation",
      measure:
        "Whether the written answer says what the data says: required statements present, no claims sourced from the open web when the question was about the data pull, and known gotchas surfaced (for example, data that should not be summed across years, or compared across product versions).",
      misleads:
        "The prose is the part users actually read. An answer whose chart is right but whose text overstates, omits a caveat, or quietly invents context misleads even the careful reader.",
      gaps: "Caveat coverage is judged against a curated list per dataset, which grows as we find omissions; it is not yet exhaustive. Some judged checks run info-only until their judge is stable enough to gate on, and tone (hedging too much or too little) is not scored.",
    },
    {
      bucket: "output",
      measure:
        "Whether the answer ships the right artefacts: a chart of the right type, well-formed and matching the answer; the right map layer; dashboard widgets present and valid where asked for.",
      misleads:
        "A missing or malformed chart makes a right answer unusable; a wrong chart type (a single-year bar where a trend line was needed) invites the wrong conclusion from correct data.",
      gaps: "Chart readability (labelling, scale choices) is not scored, only structural validity and type. Map-layer correctness is checked for presence, not yet for styling or legend accuracy.",
    },
  ] satisfies MethodologyDimension[],
  gapsTitle: "What we don't yet measure, and what we are doing about it",
  gapsBody:
    "Question types with no eval coverage yet show as hatched rows and cells in the matrix; the question bank grows toward them before each annual benchmark freeze. User-drawn custom areas and multi-turn conversations are the two known structural gaps. When we find a new way the system can mislead someone, the response is always the same: write test questions for it, add them to the growing bank, and let the next benchmark version carry them. The frozen benchmark keeps the headline comparable; the growing bank keeps it honest.",
  pointer: "Interested in what we measure and why?",
  pointerCta: "Read the methodology",
} as const;
