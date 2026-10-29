/**
 * Normalised page data for one BENCHMARK run, parsed once from the wire
 * (`results/benchmark/pages/<run_id>.json` in wri/gnw-gold-evals, written
 * by `tools/benchmark_page.py`) in `api/`. Rates are shares in [0, 1];
 * `null` only where a group had no scored question.
 */

import type { STAGE_ORDER } from "./config";
import type { Release } from "./releases";

export type StageKey = (typeof STAGE_ORDER)[number];

/** A failed question is attributed to its earliest failing stage, or to
 * "unattributed" when only shared checks failed. */
export type AttributionKey = StageKey | "unattributed";

export type Verdict = "pass" | "fail" | "error" | "uncovered";

/** "inconsistent": right overall, but not right on every try. */
export type QuestionStatus = "pass" | "inconsistent" | "fail" | "error";

export interface GroupStats {
  /** Every question in the group, errored ones included. */
  readonly total: number;
  /** Questions with a pass or fail verdict (errors excluded). */
  readonly scored: number;
  /** Questions with no attempt the harness could score. */
  readonly errors: number;
  /** Questions right on the majority of trials (the North Star count). */
  readonly passed: number;
  readonly failed: number;
  readonly majority: number | null;
  /** Share right on every trial: the page's headline measure. */
  readonly everyTime: number | null;
  /** Share right on at least one trial. */
  readonly anyTime: number | null;
  /** Failed questions per earliest failing stage; zero where none. */
  readonly failureModes: Readonly<Record<AttributionKey, number>>;
}

export interface StageSummary {
  readonly key: StageKey;
  /** Questions where the stage had at least one evaluated gating check. */
  readonly checked: number;
  /** Failed questions whose earliest failing stage is this one. */
  readonly firstFailures: number;
}

export interface FailExample {
  readonly query: string;
  readonly failedChecks: readonly string[];
}

export interface QueryType {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface MeasuredType extends QueryType {
  readonly stats: GroupStats;
  readonly examplePass: string | null;
  readonly exampleFail: FailExample | null;
}

export interface Count {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

export interface Composition {
  readonly types: readonly Count[];
  readonly places: readonly Count[];
  readonly datasets: readonly Count[];
  readonly synthetic: number;
}

export interface UseCaseResult {
  readonly key: string;
  readonly label: string;
  readonly stats: GroupStats;
  readonly composition: Composition;
}

/** What the agent did on one attempt, summarised from its final state. */
export interface Attempt {
  readonly tools: readonly string[];
  readonly aoiIds: readonly string[];
  readonly datasetId: string | null;
  readonly contextLayer: string | null;
  /** Start and end of the window it pulled; end null when open-ended. */
  readonly dates: readonly [string, string | null] | null;
  readonly nudge: string | null;
  readonly charts: number;
  readonly answerExcerpt: string;
}

/** Why an attempt has no verdict of its own: it got no reply (counted as
 * wrong), or the harness could not score it (left out). */
export interface AttemptError {
  readonly kind: "no_answer" | "unscored";
  readonly reason: string;
}

export interface FailedCheck {
  readonly check: string;
  readonly stage: StageKey | "shared";
  /** The check's majority verdict: "pass" means it failed on one trial only. */
  readonly verdict: "pass" | "fail";
  /** Per trial: true passed, false failed, null not evaluated. */
  readonly perTrial: readonly (boolean | null)[];
  readonly actual: string | null;
  readonly reason: string | null;
}

export interface Question {
  readonly id: string;
  readonly type: string;
  readonly typeLabel: string;
  readonly query: string;
  readonly verdict: Verdict;
  readonly status: QuestionStatus;
  readonly trialsRight: readonly boolean[];
  readonly primaryFailure: AttributionKey | null;
  readonly failedChecks: readonly FailedCheck[];
  readonly expected: Readonly<Record<string, string>>;
  /** Expected answer drafted and not yet reviewed; always false on a run
   * not released as a draft. */
  readonly drafted: boolean;
  /** One entry per trial; null when no agent state was recorded. */
  readonly attempts: readonly (Attempt | null)[];
  /** One entry per trial; null when the attempt was scored normally. */
  readonly attemptErrors: readonly (AttemptError | null)[];
  readonly traceUrl: string | null;
  readonly place: string;
  readonly useCases: readonly string[];
  readonly synthetic: boolean;
}

export interface BenchmarkPage {
  readonly run: {
    readonly runId: string;
    readonly started: string;
    readonly numTrials: number;
    readonly harnessSha: string | null;
    /** Its release is a draft (`model/releases.ts`); every draft mark on
     * the page follows this, not the page data. */
    readonly draft: boolean;
  };
  readonly benchmark: {
    readonly version: string;
    /** The Benchmark Set year, e.g. "2026". */
    readonly set: string;
    readonly members: number;
    /** Sheet rows left out of the version (e.g. waiting for a test account). */
    readonly excluded: number;
  };
  readonly summary: GroupStats;
  readonly stages: readonly StageSummary[];
  readonly types: readonly MeasuredType[];
  readonly unmeasuredTypes: readonly QueryType[];
  readonly useCases: readonly UseCaseResult[];
  readonly questions: readonly Question[];
}

/** A released run (`model/releases.ts`), as the page lists it. */
export interface BenchmarkRunRef extends Release {
  /** "October 2026", or "28 October 2026" when another release shares
   * the month. */
  readonly label: string;
}

/** One run's headline on the accuracy-over-time chart. */
export interface TrendPoint {
  readonly runId: string;
  readonly started: string;
  readonly draft: boolean;
  /** Share right on every try, in [0, 1]. */
  readonly everyTime: number;
  /** Share right on at least 2 of 3 tries. */
  readonly majority: number | null;
  /** Share right on at least 1 of 3 tries. */
  readonly anyTime: number | null;
}
