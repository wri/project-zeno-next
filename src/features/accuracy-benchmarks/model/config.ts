/**
 * Stages and place wording mirrored from gnw-gold-evals (`goldset.benchmark`
 * STAGE_ORDER, the place kinds in `tools/benchmark_page.py`); update both
 * together. The checks are in `checks.ts`.
 */

import type { AttributionKey, StageKey } from "./types";

/** Attribution order: a failed question counts at its earliest failing stage. */
export const STAGE_ORDER = [
  "scope",
  "retrieval",
  "analysis",
  "explanation",
  "output",
] as const;

export const ATTRIBUTION_ORDER: readonly AttributionKey[] = [
  ...STAGE_ORDER,
  "unattributed",
];

export const STAGE_LABELS: Readonly<Record<AttributionKey | "shared", string>> =
  {
    scope: "Scope",
    retrieval: "Retrieval",
    analysis: "Analysis",
    explanation: "Explanation",
    output: "Output",
    unattributed: "Unattributed",
    shared: "Shared",
  };

export interface StageCopy {
  /** The question the check asks of every answer. */
  readonly question: string;
  readonly what: string;
  readonly why: string;
  readonly notYet: string;
}

/** Wording from the published accuracy page, including the team's edits. */
export const STAGE_COPY: Readonly<Record<StageKey, StageCopy>> = {
  scope: {
    question:
      "Does it choose the right response: answer, ask a clarifying question, or decline?",
    what: "Whether Horizon answers when it should, asks a clarifying question when a request is ambiguous, and declines when it cannot answer safely, rather than guessing.",
    why: "A confident answer to the wrong question looks exactly like a right answer, which makes scope failures the hardest to spot.",
    notYet:
      "Asking back when one dataset clearly fits currently counts as a retrieval failure, because no data was fetched. Scope across multi-turn conversations is not tested.",
  },
  retrieval: {
    question: "Does it get the right data: place, dataset, settings and dates?",
    what: "Whether Horizon finds the right place, chooses the right dataset, applies the right settings (thresholds, forest filters), uses the requested dates, and fetches the data.",
    why: "Correct math on the wrong place, dataset or years gives a confident answer about the wrong thing, which is worse than no answer.",
    notYet:
      "User-drawn custom areas and saved-area portfolios are not in the benchmark yet; they need seeded test accounts.",
  },
  analysis: {
    question: "Does it calculate correctly from that data?",
    what: "Whether the figures hold together: every value the chart plots is present. Checked by code, not by a model, whenever an answer includes a chart.",
    why: "Analysis failures produce precise-looking numbers that are wrong, which could lead to users confidently citing incorrect numbers.",
    notYet:
      "Comparing figures with the data service's own totals is not yet in the benchmark; it is being built before the November freeze.",
  },
  explanation: {
    question:
      "Does the written answer describe the data accurately, with the right caveats?",
    what: "Whether the written answer says what the data says: no web sources used in place of the data, and required statements present where a question needs them (for example, not naming a commodity the driver data does not identify).",
    why: "The text is the part users read. A correct chart under text that over-claims a cause misleads even a careful reader.",
    notYet:
      "Dataset caveats are required by the system's instructions but not yet scored everywhere. Whether the reply's main figure matches its chart is tracked, not yet scored.",
  },
  output: {
    question: "Does it return the right chart, map layer or table?",
    what: "Whether the answer includes the right chart or map layer, and whether charts are well-formed and match the answer.",
    why: "A missing or broken chart makes a right answer unusable; the wrong chart type invites the wrong conclusion from correct data.",
    notYet: "Chart readability is not scored, only structural validity.",
  },
};

/** Plurals for the place kinds in a use case's mix sentence. */
export const PLACE_PLURALS: Readonly<Record<string, string>> = {
  country: "countries",
  "sub-national area": "sub-national areas",
  "protected area": "protected areas",
  "indigenous or community land": "Indigenous or community lands",
  "no place named": "no specific place",
  "several named areas": "several named areas",
  "many areas": "many areas at once",
  "global or regional": "global or regional areas",
  "a point": "single points",
  "other area": "other areas",
  "own area": "users' own areas",
};
