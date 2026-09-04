/**
 * Domain types for the evals dashboard (camelCase). The wire shapes live in
 * the gnw-gold-evals ledger (snake_case JSON committed to GitHub) and are
 * mapped at the api/ boundary — see `api/rest-evals-gateway.ts`.
 */

import type { BucketName } from "./config";

/** Which case store a run or artefact belongs to. */
export type EvalSet = "gold" | "challenge";

/** Tri-state check value: 1 pass, 0 fail, null not evaluated. */
export type CheckValue = number | null;

export type Verdict = "pass" | "fail" | "error" | "uncovered";

export interface VerdictCounts {
  pass: number;
  fail: number;
  error: number;
  uncovered: number;
}

export interface BucketTally {
  passed: number;
  evaluated: number;
}

export interface BucketEntry {
  dedicated: BucketTally;
  shared: BucketTally;
  rowsCovered: number;
}

/** The per-run `buckets` block precomputed by the harness. */
export interface BucketsBlock {
  buckets: Record<BucketName, BucketEntry>;
  rowsTotal: number;
  verdicts: VerdictCounts;
}

export interface RunHeader {
  runId: string;
  started: string;
  environment: string;
  build: string;
  /** Agent tool profile; null means the default profile. */
  ff: string | null;
  numTrials: number;
  caseset: string;
  casesetVersion: string;
  judgeModel: string | null;
  workers: number | null;
  trialTimeout: number | null;
  resumed: boolean;
}

/** One entry of results/index.json — enough to list runs and draw trends. */
export interface RunSummary extends RunHeader {
  /** Repo-relative path of the run file, fetchable from GitHub raw. */
  path: string;
  buckets: BucketsBlock | null;
}

export interface RunIndex {
  gold: RunSummary[];
  challenge: RunSummary[];
}

export interface TrialResult {
  checks: Record<string, CheckValue>;
  latencyS: number | null;
}

export interface TurnDetail {
  query: string;
  reasons: Record<string, string>;
  latencyS: number | null;
  traceUrl: string | null;
}

/** One per-case result row of a run file. */
export interface CaseRow {
  uid: string;
  id: string;
  /** Multi-turn rows flatten per-turn checks under a `t<N>.` prefix. */
  checks: Record<string, CheckValue>;
  reasons: Record<string, string>;
  /** Measured values recorded for failed checks only. */
  actuals: Record<string, string>;
  latencyS: number | null;
  traceUrl: string | null;
  /** Per-trial results on multi-trial runs; `checks` is the majority. */
  trials: TrialResult[];
  turnsDetail: TurnDetail[];
  error: string | null;
  judgeErrors: string[];
  staleCase: boolean;
  slow: boolean;
}

export interface RunDetail extends RunHeader {
  rows: CaseRow[];
  buckets: BucketsBlock | null;
}

/** One entry of cases_index.json — the uid join table back to the store. */
export interface CaseIndexEntry {
  id: string;
  uid: string;
  /** CHALLENGE hierarchy level above group; absent on GOLD cases. */
  set?: string;
  group: string;
  status: string;
  difficulty?: string;
  behaviour?: string;
  /** Single-turn cases carry `query`; multi-turn carry `turns`. */
  query?: string;
  turns?: string[];
  expectedFields: string[];
  /** Implied gating checks (base names, info-only stripped) — the
   * harness's own coverage recipe, stamped by coverage_doc.py. */
  impliedChecks: string[];
}

export interface TargetsBlock {
  overall: number | null;
  meta: Record<string, string>;
  sets: Record<
    string,
    { overall: number | null; targets: Record<string, number> }
  >;
}

export interface CoverageGroup {
  group: string;
  cases: number;
  active: number;
  statuses: Record<string, number>;
}

export interface DatasetCoverageRow {
  datasetId: string;
  datasetName: string;
  missingInstructions: string[];
  cases: number;
  answerGraded: number;
  parameters: { name: string; cases: number }[];
  contextLayers: { name: string; cases: number }[];
}

export interface DatasetCoverage {
  source: { sha: string; ref: string; synced: string } | null;
  datasets: DatasetCoverageRow[];
  unknownDatasetIds: { datasetId: string; cases: number }[];
}

export interface KnownGaps {
  unusedExpectedFields: string[];
  infoOnlyChecks: string[];
  catalogDatasetsNoCase: string[];
  uncoveredParameters: Record<string, string[]>;
  uncoveredContextLayers: Record<string, string[]>;
}

/** cases/<store>/coverage.json — the COVERAGE.md sections as data. */
export interface CoverageDoc {
  store: string;
  casesetVersion: string;
  caseCount: number;
  statuses: Record<string, number>;
  activeCount: number;
  groups: CoverageGroup[];
  bucketCoverage: Record<BucketName, { dedicated: number; sharedOnly: number }>;
  expectedFields: { field: string; cases: number; switchesOn: string }[];
  datasetCoverage: DatasetCoverage | null;
  multiTurn: {
    conversations: number;
    turns: number;
    deltaAssertions: Record<string, number>;
  };
  parked: {
    id: string;
    status: string;
    group: string;
    reason: string | null;
  }[];
  knownGaps: KnownGaps;
  targets: TargetsBlock | null;
}

/** A rate with its Wilson 95% interval; null rates mean n = 0. */
export interface RateStat {
  n: number;
  passed: number;
  strictPassed: number;
  rate: number | null;
  ciLow: number;
  ciHigh: number;
  strictRate: number | null;
}

export interface SetRollup extends RateStat {
  byGroup: Record<string, RateStat>;
  byDifficulty: Record<string, RateStat>;
}

export interface FailingRow {
  id: string;
  set: string;
  group: string;
  difficulty: string;
  failedChecks: string[];
}

/** Client-side port of tools/challenge_rollup.py::rollup_run. */
export interface RunRollup {
  verdicts: VerdictCounts;
  /** Measured share of non-stale rows; errors are availability, not quality. */
  availability: number | null;
  stale: string[];
  errored: { id: string; error: string }[];
  uncovered: string[];
  notRun: string[];
  overall: RateStat;
  bySet: Record<string, SetRollup>;
  failing: FailingRow[];
}
