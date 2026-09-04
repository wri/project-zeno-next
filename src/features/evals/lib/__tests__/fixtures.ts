/**
 * Domain-shaped rows trimmed from real ledger runs (null checks mostly
 * dropped for readability — the wire always carries all 28 names):
 * - goldTrialRow: id 1-005 from gold run 20260831T163347Z_prod (3 trials)
 * - multiturnRow: id mt-001 from the same run (t<N>. prefixed checks)
 * - challengeInfoRow: id ch-quant-067 from challenge run
 *   20260901T203951Z_prod (slow flag, info-only failure)
 * - errorRow: id mt-007 from gold run 20260831T155003Z_prod_experimental
 */

import type { CaseRow, RunSummary } from "../../model/types";

export function caseRow(
  partial: Partial<CaseRow> & Pick<CaseRow, "uid" | "id" | "checks">
): CaseRow {
  return {
    reasons: {},
    actuals: {},
    latencyS: null,
    traceUrl: null,
    trials: [],
    turnsDetail: [],
    error: null,
    judgeErrors: [],
    staleCase: false,
    slow: false,
    ...partial,
  };
}

/** Majority verdict fail; trials flap on scope_match. */
export const goldTrialRow: CaseRow = caseRow({
  uid: "6c8b9a9d674922d2",
  id: "1-005",
  checks: {
    answer_traceability: 1,
    aoi_id_match: 1,
    chart_integrity: 1,
    chart_well_formed: 1,
    context_layer_match: 0,
    dataset_id_match: 0,
    pull_source_match: 0,
    scope_match: 0,
    agent_answer: null,
  },
  actuals: { dataset_id_match: "11", pull_source_match: "11" },
  latencyS: 126.2,
  traceUrl: "https://langfuse.example/traces/fd2b7fc5",
  trials: [
    {
      checks: { aoi_id_match: 1, dataset_id_match: 0, scope_match: 0 },
      latencyS: 17,
    },
    {
      checks: { aoi_id_match: 1, dataset_id_match: 0, scope_match: 0 },
      latencyS: 20.7,
    },
    {
      checks: {
        aoi_id_match: 1,
        dataset_id_match: 0,
        context_layer_match: 0,
        pull_source_match: 0,
        chart_integrity: 1,
        answer_traceability: 1,
        chart_well_formed: 1,
        scope_match: 1,
      },
      latencyS: 126.2,
    },
  ],
});

/** Clean multi-turn pass: every gating check green on every trial. */
export const multiturnRow: CaseRow = caseRow({
  uid: "f25772290e4699fd",
  id: "mt-001",
  checks: {
    "t1.clarification_requested": 1,
    "t1.aoi_id_match": null,
    "t2.answer_traceability": 1,
    "t2.chart_integrity": 1,
    "t2.chart_well_formed": 1,
    "t2.scope_match": 1,
    "t2.state_delta": 1,
  },
  latencyS: 47.4,
  trials: [1, 2, 3].map(() => ({
    checks: {
      "t1.clarification_requested": 1,
      "t2.chart_integrity": 1,
      "t2.answer_traceability": 1,
      "t2.chart_well_formed": 1,
      "t2.scope_match": 1,
      "t2.state_delta": 1,
    },
    latencyS: 47.4,
  })),
  turnsDetail: [
    {
      query: "Show me recent disturbance alerts in Puri",
      reasons: {},
      latencyS: 11.1,
      traceUrl: "https://langfuse.example/traces/a615adb6",
    },
    {
      query: "I mean the Puri district in Odisha, India",
      reasons: {
        answer_traceability: "deterministic check: within the 2% tolerance",
      },
      latencyS: 36.3,
      traceUrl: "https://langfuse.example/traces/5cf93859",
    },
  ],
});

/** Fail on two gating checks; the info-only failure must not add a third. */
export const challengeInfoRow: CaseRow = caseRow({
  uid: "138f941308d3dab5",
  id: "ch-quant-067",
  checks: {
    aoi_id_match: 1,
    dataset_id_match: 0,
    data_pull_exists: 1,
    answered_without_data: 1,
    web_fallback: 1,
    pull_source_match: 0,
    chart_integrity: 1,
    answer_traceability: 0,
    chart_well_formed: 1,
  },
  actuals: {
    dataset_id_match: "8",
    pull_source_match: "8",
    answer_traceability: "59.9 million hectares",
  },
  latencyS: 248.9,
  slow: true,
});

/** Everything green, no trials (1-trial run): strict falls back to majority. */
export const passingChallengeRow: CaseRow = caseRow({
  uid: "970fb685b7da35fd",
  id: "ch-quant-001",
  checks: {
    aoi_id_match: 1,
    dataset_id_match: 1,
    context_layer_match: 1,
    data_pull_exists: 1,
    date_extraction: 1,
    answered_without_data: 1,
    web_fallback: 1,
    pull_source_match: 1,
    chart_integrity: 1,
    answer_traceability: 1,
    chart_well_formed: 1,
    date_coverage: 1,
  },
  latencyS: 36.3,
});

/** An error is an error, however many checks were scored before it. */
export const errorRow: CaseRow = caseRow({
  uid: "ea4e5bf8c098c152",
  id: "mt-007",
  checks: {
    "t1.agent_answer": 0,
    "t1.dataset_id_match": 1,
    "t2.state_delta": 1,
  },
  error: "t2: ReadTimeout",
  latencyS: 237,
  slow: true,
});

/** Only info-only checks evaluated: uncovered, never a pass. */
export const uncoveredRow: CaseRow = caseRow({
  uid: "00000000deadbeef",
  id: "x-001",
  checks: { aoi_id_match: null, date_coverage: 1 },
});

export function runSummary(partial: Partial<RunSummary>): RunSummary {
  return {
    runId: "20260831T163347Z_prod",
    path: "results/gold/runs/20260831T163347Z_prod.json",
    started: "2026-08-31T16:33:47Z",
    environment: "prod",
    build: "baseline",
    ff: null,
    numTrials: 3,
    caseset: "v2",
    casesetVersion: "bf5a593d71d658ae",
    judgeModel: "claude-haiku-4-5",
    workers: 10,
    trialTimeout: 900,
    resumed: false,
    buckets: {
      buckets: {
        retrieval: {
          dedicated: { passed: 407, evaluated: 438 },
          shared: { passed: 0, evaluated: 0 },
          rowsCovered: 103,
        },
        analysis: {
          dedicated: { passed: 95, evaluated: 99 },
          shared: { passed: 97, evaluated: 104 },
          rowsCovered: 92,
        },
        explanation: {
          dedicated: { passed: 171, evaluated: 186 },
          shared: { passed: 67, evaluated: 74 },
          rowsCovered: 103,
        },
        output: {
          dedicated: { passed: 178, evaluated: 185 },
          shared: { passed: 39, evaluated: 39 },
          rowsCovered: 96,
        },
        scope: {
          dedicated: { passed: 98, evaluated: 106 },
          shared: { passed: 9, evaluated: 9 },
          rowsCovered: 101,
        },
      },
      rowsTotal: 109,
      verdicts: { pass: 94, fail: 15, error: 0, uncovered: 0 },
    },
    ...partial,
  };
}
