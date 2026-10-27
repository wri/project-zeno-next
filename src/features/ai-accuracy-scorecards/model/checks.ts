/**
 * Every check gnw-gold-evals can score an answer with, in plain words.
 * Mirrored from the BENCHMARK branch: the checks in `goldset.registry`, their
 * steps and info-only status in `goldset.buckets`, the expected-answer fields
 * that switch each on in `src/goldset/evaluators/README.md`. Update both
 * together.
 */

import type { StageKey } from "./types";

export interface CheckInfo {
  /** The check's name in run results. */
  readonly key: string;
  readonly label: string;
  /** Its step; a shared check counts toward two, so its failures are not
   * attributed to either. Empty for a tracked check outside the steps. */
  readonly stages: readonly StageKey[];
  readonly scoredBy: "code" | "ai";
  readonly what: string;
  /** Completes "Applies when …". */
  readonly when: string;
  /** Expected-answer fields that switch the check on; null when it runs
   * whenever the answer gives it something to check, such as a chart. */
  readonly switchedOnBy: readonly string[] | null;
  /** Set when the check is reported but never decides a verdict: why. */
  readonly notScored?: string;
}

const DATA_PULL = ["data_pull", "answer", "dashboard_widgets"];

export const CHECKS: readonly CheckInfo[] = [
  // Scope
  {
    key: "clarification_requested",
    label: "Asked back when it should",
    stages: ["scope"],
    scoredBy: "ai",
    what: "Whether Horizon asks a clarifying question when a request is ambiguous, and answers without asking back when it is not. An answer that ends with an offer to go further does not count as asking back.",
    when: "the question is marked as needing, or not needing, a clarifying question",
    switchedOnBy: ["clarification"],
  },
  {
    key: "forbidden_tools_absent",
    label: "Did only what was asked (no analysis on a show-on-map request)",
    stages: ["scope"],
    scoredBy: "code",
    what: "Whether Horizon stayed within the request. Asked to show a dataset on the map, it should show it, not go on to fetch data and analyse it.",
    when: "the request is to show something on the map, or otherwise rules out steps",
    switchedOnBy: ["forbidden_tools"],
  },
  {
    key: "scope_match",
    label: "Did the right kind of work",
    stages: ["scope"],
    scoredBy: "code",
    what: "Whether Horizon took the expected route: analyse, suggest datasets, ask a clarifying question, or decline. Decided from what Horizon did, not from how it worded the reply.",
    when: "the question says which route is right",
    switchedOnBy: ["scope"],
  },
  {
    key: "suggested_datasets_match",
    label: "Suggested suitable datasets",
    stages: ["scope"],
    scoredBy: "code",
    what: "When asked which data to use, at least one of Horizon's suggestions is suitable and none falls outside the suitable set.",
    when: "the question asks which datasets could answer it",
    switchedOnBy: ["suggested_datasets"],
  },
  {
    key: "nudge_match",
    label: "Offered the right options to choose from",
    stages: ["scope"],
    scoredBy: "code",
    what: "When Horizon asks the user to choose, for example between two places with the same name, it offers the right kind of choice and the expected options.",
    when: "the question is ambiguous in a way only the user can settle",
    switchedOnBy: ["nudge_type", "nudge_options"],
  },
  {
    key: "accepted_nudge_match",
    label: "Offered the right choice where asking is a fair answer",
    stages: ["scope"],
    scoredBy: "code",
    what: "On some questions, asking the user to choose is as good as answering, for example between the datasets that could answer it. Horizon then passes by fetching the right data or by offering every expected option; other options may be offered as well. When it asks, the checks that need fetched data are skipped.",
    when: "the question lists the datasets or places Horizon may offer as a choice",
    switchedOnBy: ["accept_nudge_offering", "accept_aoi_nudge_offering"],
  },
  {
    key: "dashboard_created",
    label: "Created a dashboard only when asked",
    stages: ["scope", "output"],
    scoredBy: "code",
    what: "Whether Horizon created a dashboard when asked for one, and none when it was not. A dashboard nobody asked for fails.",
    when: "Horizon creates a dashboard, or the question asks for one",
    switchedOnBy: null,
  },

  // Retrieval
  {
    key: "aoi_id_match",
    label: "Picked the right place",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether the place Horizon chose is exactly the place in the question. When a question names several places, it must pick all of them and no others. Where a name fairly fits more than one set of places, any of those sets counts.",
    when: "the question names a place",
    switchedOnBy: ["aoi_ids"],
  },
  {
    key: "dataset_id_match",
    label: "Picked the right dataset",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether Horizon chose the right dataset. Where more than one dataset can answer, any of them counts; where no dataset fits, choosing none is right.",
    when: "the question needs a particular dataset",
    switchedOnBy: ["dataset_id"],
  },
  {
    key: "dataset_parameter_match",
    label: "Applied the right settings (such as canopy threshold)",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether the dataset settings that decide which number is calculated, such as a canopy cover threshold, match the question.",
    when: "the question sets a threshold or another dataset setting",
    switchedOnBy: ["dataset_parameters"],
  },
  {
    key: "context_layer_match",
    label: "Applied the right forest filter",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether Horizon narrowed the data with the right filter, such as primary forest or a land-cover class, or with none when none was asked for.",
    when: "the question is about one kind of land, such as primary forest",
    switchedOnBy: ["context_layer"],
  },
  {
    key: "date_extraction",
    label: "Fetched data covering the time window asked for",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether the data Horizon asked its tools for covers the dates the question names. Fetching a wider window and narrowing it down afterwards is fine. For recent-alert questions (“in the last month”), a few days short count.",
    when: "the question names a period",
    switchedOnBy: ["start_date", "end_date"],
  },
  {
    key: "data_pull_exists",
    label: "Fetched the data",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether Horizon actually fetched data from the analysis service, rather than stopping first, for example to ask permission.",
    when: "the question needs data to answer",
    switchedOnBy: DATA_PULL,
  },
  {
    key: "answered_without_data",
    label: "Did not answer without data",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Catches a confident, detailed answer given with no data fetched and no dataset chosen. A short refusal does not count against it.",
    when: "the question needs data to answer",
    switchedOnBy: DATA_PULL,
  },
  {
    key: "pull_source_match",
    label: "Pulled from the right source",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "Whether the data Horizon fetched came from the right dataset, not just the dataset it said it chose.",
    when: "the question needs a particular dataset and data was fetched",
    switchedOnBy: ["dataset_id"],
  },
  {
    key: "state_delta",
    label: "Kept track of the conversation",
    stages: ["retrieval"],
    scoredBy: "code",
    what: "In a conversation, whether what should change between turns does (such as the place, once the user clarifies it) and what should stay does.",
    when: "the question is part of a conversation",
    switchedOnBy: ["deltas"],
  },

  // Analysis
  {
    key: "chart_integrity",
    label: "Chart has no missing values",
    stages: ["analysis"],
    scoredBy: "code",
    what: "Whether every value the chart plots is present. Gaps usually mean two sets of figures were joined wrongly, and the reply then quotes the wrong figure.",
    when: "the answer includes a chart",
    switchedOnBy: null,
  },
  {
    key: "figure_match",
    label: "Reply gives the right figure from the data",
    stages: ["analysis"],
    scoredBy: "code",
    what: "Whether the figure the question asks for, recalculated from the data Horizon itself fetched, appears in the reply. Stated rounding, other units and fair alternative calculations count. Whether the data itself is right is checked separately for each dataset.",
    when: "the question asks for a figure",
    switchedOnBy: ["figure"],
  },
  {
    key: "answer_period_match",
    label: "Answered for the period asked",
    stages: ["analysis"],
    scoredBy: "ai",
    what: "Whether the figures the reply gives as its answer cover exactly the period the question asks about, not a wider or narrower one. Clearly labelled figures for other periods are fine as context.",
    when: "the question names a period",
    switchedOnBy: ["start_date", "end_date"],
  },
  {
    key: "charts_answer",
    label: "Chart shows the expected figure",
    stages: ["analysis", "output"],
    scoredBy: "code",
    what: "Whether the chart's own data contains the expected figure, within 2%.",
    when: "the question has an expected figure and the answer includes a chart",
    switchedOnBy: ["answer"],
  },
  {
    key: "agent_answer",
    label: "Reply gives the expected answer",
    stages: ["analysis", "explanation"],
    scoredBy: "ai",
    what: "Whether the written reply gives the expected answer. An AI reviewer finds the figure in the reply and code checks it is within 2%; years and yes-or-no answers must match exactly.",
    when: "the question has an expected answer",
    switchedOnBy: ["answer"],
  },

  // Explanation
  {
    key: "expected_text_match",
    label: "Reply says what it must",
    stages: ["explanation"],
    scoredBy: "ai",
    what: "Whether the reply includes something the question requires, such as a caveat, a definition, or declining for the right reason. Wording can differ if the meaning is the same.",
    when: "the question lists something the reply must say or do",
    switchedOnBy: ["text"],
  },
  {
    key: "web_fallback",
    label: "Did not use web sources in place of the data",
    stages: ["explanation"],
    scoredBy: "code",
    what: "Catches a reply that cites outside websites instead of fetching Horizon's data. Once data was fetched, a cited article beside the figures is fine, as are links to Global Nature Watch, Global Forest Watch and articles the question accepts.",
    when: "the question needs data to answer",
    switchedOnBy: DATA_PULL,
  },
  {
    key: "accepted_blog_match",
    label: "Cited an accepted article when answering from one",
    stages: ["explanation"],
    scoredBy: "code",
    what: "Some questions are fairly answered by a named WRI or Land & Carbon Lab article. If Horizon answers from its article search instead of fetching data, the reply must link at least one of those articles, and the checks that need fetched data are skipped. Fetching the right data still passes.",
    when: "the question lists articles that can answer it",
    switchedOnBy: ["accept_blog_sources"],
  },
  {
    key: "figure_claim_match",
    label: "Drew the conclusion the data supports",
    stages: ["explanation"],
    scoredBy: "ai",
    what: "Whether the reply states the conclusion the fetched data supports, such as which place had more loss, whether a year was a record, or whether forests are a net sink. Code works out the conclusion from the data; the AI reviewer only checks the reply says it.",
    when: "the question asks for a comparison, a record or a direction",
    switchedOnBy: ["figure_claim"],
  },

  // Output
  {
    key: "chart_well_formed",
    label: "Chart is well-formed",
    stages: ["output"],
    scoredBy: "code",
    what: "Whether each chart has data, and every field it plots exists in that data, so it can be drawn.",
    when: "the answer includes a chart",
    switchedOnBy: null,
  },
  {
    key: "chart_produced",
    label: "Included a chart",
    stages: ["output"],
    scoredBy: "code",
    what: "Whether an answer that needs a chart has one.",
    when: "the question has an expected figure",
    switchedOnBy: ["answer"],
  },
  {
    key: "chart_type_match",
    label: "Used the right kind of chart",
    stages: ["output"],
    scoredBy: "code",
    what: "Whether the chart is the kind the question calls for: bar, line or pie.",
    when: "the question calls for a kind of chart",
    switchedOnBy: ["chart_type"],
  },
  {
    key: "dashboard_aoi_match",
    label: "Dashboard covers the right place",
    stages: ["output"],
    scoredBy: "code",
    what: "Whether a new dashboard covers exactly one place, the place in the question.",
    when: "the question asks for a dashboard of a place",
    switchedOnBy: ["dashboard_created"],
  },
  {
    key: "dashboard_widgets_match",
    label: "Dashboard has the right parts",
    stages: ["output"],
    scoredBy: "code",
    what: "Whether the dashboard has the expected mix of charts, maps and text.",
    when: "the question says what the dashboard should contain",
    switchedOnBy: ["dashboard_widgets"],
  },
  {
    key: "dashboard_widgets_valid",
    label: "Dashboard parts have content",
    stages: ["output"],
    scoredBy: "code",
    what: "Whether each part of a dashboard has its content (an insight, a map layer or text), not an empty box.",
    when: "Horizon creates a dashboard",
    switchedOnBy: null,
  },

  // Tracked, never part of a verdict
  {
    key: "date_coverage",
    label: "Data covers the requested window",
    stages: [],
    scoredBy: "code",
    what: "Whether the data Horizon fetched covers the period asked for.",
    when: "the question names a period",
    switchedOnBy: ["start_date", "end_date"],
    notScored:
      "Not scored, by design: for yearly data Horizon rightly fetches every year and picks out the ones asked for, so this changes between runs without the answer being wrong.",
  },
  {
    key: "answer_traceability",
    label: "Figures in the reply match the chart",
    stages: ["explanation"],
    scoredBy: "code",
    what: "Whether the main figure in the reply can be found in the chart shown beside it.",
    when: "the answer includes a chart and a figure with a unit",
    switchedOnBy: null,
    notScored:
      "Not scored yet: it mistook counts and rankings without units for figures. It will count once a full run shows no such mistakes.",
  },
  {
    key: "class_value_match",
    label: "Figures for each class match",
    stages: ["analysis"],
    scoredBy: "code",
    what: "Whether the figure for each class, such as each land-cover type, matches the expected value, so a wrong part cannot hide under a right total.",
    when: "the question lists expected figures per class",
    switchedOnBy: ["class_values"],
    notScored: "Not scored yet: its expected values have not been verified.",
  },
  {
    key: "charts_answer_judge",
    label: "AI review of the chart",
    stages: [],
    scoredBy: "ai",
    what: "An AI reviewer's view of whether the charts are a suitable, complete way to answer.",
    when: "the question has an expected figure and the answer includes a chart",
    switchedOnBy: ["answer"],
    notScored:
      "Not scored: its verdict changed between identical runs. It will count only once it gives the same verdict reliably.",
  },
];

const BY_KEY = new Map(CHECKS.map((c) => [c.key, c]));

/** A check's plain-language name; "(judged)" marks an AI reviewer's call. */
export function checkLabel(check: string): string {
  const info = BY_KEY.get(check);
  if (!info) return check;
  return info.scoredBy === "ai" ? `${info.label} (judged)` : info.label;
}
