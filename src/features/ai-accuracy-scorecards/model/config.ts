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

/** Wording from the team's methodology draft, including its in-page edits. */
export const STAGE_COPY: Readonly<Record<StageKey, StageCopy>> = {
  scope: {
    question:
      "Does it choose the right response: answer, ask a clarifying question or decline?",
    what: "Whether Horizon answers when it should, asks a clarifying question when a request is ambiguous and declines when it cannot answer safely, rather than guessing.",
    why: "A confident answer to the wrong question looks exactly like a right answer, which makes scope failures the hardest to spot.",
    notYet:
      "Asking back when one dataset clearly fits counts as a retrieval failure, because no data was fetched, unless the question lists asking back as a fair answer. Scope across multi-turn conversations is not tested.",
  },
  retrieval: {
    question: "Does it get the right data: place, dataset, settings and dates?",
    what: "Whether Horizon finds the right place, chooses the right dataset, applies the right settings (thresholds, forest filters), uses the requested dates and fetches the data.",
    why: "Correct math on the wrong place, dataset or years gives a confident answer about the wrong thing, which is worse than no answer.",
    notYet:
      "User-drawn custom areas and saved-area portfolios are not in the benchmark yet; they need seeded test accounts.",
  },
  analysis: {
    question: "Does it calculate correctly from that data?",
    what: "Whether Horizon calculates correctly from the data it fetched: code recalculates the figure the question asks for from that same data and looks for it in the reply, an AI reviewer checks the reply's figures are for the period asked, and code checks the chart has no missing values. Whether the reply's figures match the chart is tracked but not yet scored; the figure check already tests the reply against the data itself.",
    why: "Analysis failures produce precise-looking numbers that are wrong, which could lead to users confidently citing incorrect numbers.",
    notYet:
      "Whether the fetched data is itself right is out of scope: the figure check assumes it is and tests what Horizon does with it. Comparing figures with an independent fetch of the same data is part of the internal regression suite, not this benchmark.",
  },
  explanation: {
    question:
      "Does the written answer describe the data accurately, with the right caveats?",
    what: "Whether the written answer says what the data says: no web sources used in place of the data, and required statements present where a question needs them (for example, not naming a commodity the driver data does not identify).",
    why: "The text is the part users read. A correct chart under text that over-claims a cause misleads even a careful reader.",
    notYet:
      "Dataset caveats are required by the system's instructions but not yet scored everywhere.",
  },
  output: {
    question: "Does it return the right chart, map layer or table?",
    what: "Whether the answer includes the right chart or map layer, and whether charts are well-formed and match the answer.",
    why: "A missing or broken chart makes a right answer unusable; the wrong chart type invites the wrong conclusion from correct data.",
    notYet: "Chart readability is not scored, only structural validity.",
  },
};

export interface UseCaseCopy {
  readonly key: string;
  /** The short name the dashboard and All questions use. */
  readonly name: string;
  /** The methodology's longer title, above its description. */
  readonly title: string;
  readonly text: string;
  readonly more?: string;
}

/**
 * GNW's priority use cases. The short names are the FE's (AJ, 2026-10-29), so
 * every run in the picker shows the same ones: the gateway ignores the labels
 * the page data carries (gnw-gold-evals `goldset.benchmark` USE_CASES), and
 * only the keys must match. The methodology keeps the longer titles.
 */
export const USE_CASES: readonly UseCaseCopy[] = [
  {
    key: "UC1",
    name: "Monitor and respond to change",
    title: "Monitor and respond to change in an area",
    text: "Users track recent disturbances, alerts and fires in an area they are responsible for, so they can patrol, respond or enforce or document illegal activity.",
  },
  {
    key: "UC2",
    name: "Monitor a portfolio of areas",
    title: "Monitor a portfolio of areas",
    text: "Users track and compare many areas (sourcing regions, suppliers, concessions, investments, protected-area networks, project sites) to spot risks and trends, screen for due diligence and compliance (for example, against a deforestation cut-off date under DCF commitments or regulations such as the EUDR) and decide where to focus resources.",
  },
  {
    key: "UC3",
    name: "Investigate change and build evidence",
    title: "Investigate change and build evidence",
    text: "Users quantify how a place has changed, what is driving that change and what the data can and cannot show, to support advocacy, journalism, land tenure claims or legal action, and communicate findings to the public and decision-makers through maps, statistics and visuals.",
  },
  {
    key: "UC4",
    name: "Set baselines and track progress",
    title: "Set baselines and track progress against targets",
    text: "Users establish a starting point and measure change against it, for project implementation, corporate commitments, results-based payments and national or global targets, including land-sector emissions and removals.",
    more: "Data also serve as independent benchmarks for national GHG inventories and global assessments (e.g., IPCC, UNFCCC, the Forest Declaration Assessment).",
  },
  {
    key: "UC5",
    name: "Plan interventions",
    title: "Decide where and how to intervene",
    text: "Users identify issues and trends, explore and analyze data and compare areas for conservation, restoration, land-use planning, permitting or policy, using data on land cover, natural land, tree cover and drivers of loss.",
  },
  {
    key: "UC6",
    name: "Find, evaluate and access data",
    title: "Find, evaluate and access data for independent analysis",
    text: "Users discover what data exists for their question, understand how it was made (methods, accuracy, versions and limits), run preliminary analysis and get results in a form they can use in their own work (tables, downloads, API access), so they can produce independent, citable analysis or integrate data and methods into their own systems, standards and indicators (e.g., national forest monitoring systems, corporate accounting standards, biodiversity and forest indicators).",
  },
];

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
