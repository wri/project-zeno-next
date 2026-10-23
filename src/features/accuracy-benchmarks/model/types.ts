/**
 * Normalised page data for one BENCHMARK run, parsed once from the wire
 * (`results/benchmark/pages/<run_id>.json` in wri/gnw-gold-evals, written
 * by `tools/benchmark_page.py`) in `api/`. Rates are shares in [0, 1];
 * `null` only where a group had no scored question.
 */

export type StageKey =
  | "scope"
  | "retrieval"
  | "analysis"
  | "explanation"
  | "output";

/** A failed question is attributed to its earliest failing stage, or to
 * "unattributed" when only shared checks failed. */
export type AttributionKey = StageKey | "unattributed";

export type Verdict = "pass" | "fail" | "error" | "uncovered";

export interface GroupStats {
  /** Questions with a pass or fail verdict (errors excluded). */
  readonly scored: number;
  readonly errors: number;
  /** Questions right on the majority of trials (the North Star count). */
  readonly passed: number;
  readonly majority: number | null;
  /** Share right on every trial: the page's headline measure. */
  readonly everyTime: number | null;
  /** Share right on at least one trial. */
  readonly anyTime: number | null;
  readonly failureModes: Readonly<Partial<Record<AttributionKey, number>>>;
}

export interface StageCheck {
  /** Questions where the stage had at least one evaluated gating check. */
  readonly checked: number;
  readonly passed: number;
  /** Failed questions whose earliest failing stage is this one. */
  readonly firstFailures: number;
}

export interface FailExample {
  readonly query: string;
  readonly failedChecks: readonly string[];
}

export interface MeasuredType {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly stats: GroupStats;
  readonly stageChecks: Readonly<Record<StageKey, StageCheck>>;
  readonly examplePass: string | null;
  readonly exampleFail: FailExample | null;
}

export interface UnmeasuredType {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface Count {
  readonly key: string;
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
  readonly uid: string;
  readonly benchmarkId: string;
  readonly type: string;
  readonly cohort: string;
  readonly difficulty: string;
  readonly query: string;
  readonly verdict: Verdict;
  readonly trialsRight: readonly boolean[];
  /** Right on every trial with no failed check at all. */
  readonly consistent: boolean;
  readonly primaryFailure: AttributionKey | null;
  readonly failedChecks: readonly FailedCheck[];
  readonly expected: Readonly<Record<string, string>>;
  /** Expected answer drafted and not yet reviewed. */
  readonly drafted: boolean;
  /** One entry per trial; null when no agent state was recorded. */
  readonly attempts: readonly (Attempt | null)[];
  readonly traceUrl: string | null;
  readonly place: string;
  readonly useCases: readonly string[];
  readonly synthetic: boolean;
}

export interface PageSummary extends GroupStats {
  readonly consistency: { readonly complete: number; readonly clean: number };
  readonly datasetsCovered: number;
}

export interface StageSummary extends StageCheck {
  readonly key: StageKey;
}

export interface BenchmarkPage {
  readonly run: {
    readonly runId: string;
    readonly started: string;
    readonly numTrials: number;
    readonly harnessSha: string;
  };
  readonly benchmark: {
    readonly version: string;
    readonly status: "draft" | "frozen" | "retired";
    readonly members: number;
    /** Sheet rows left out of the version (e.g. waiting for a test account). */
    readonly excluded: number;
  };
  readonly summary: PageSummary;
  readonly stages: readonly StageSummary[];
  readonly unattributed: number;
  readonly types: readonly MeasuredType[];
  readonly unmeasuredTypes: readonly UnmeasuredType[];
  readonly useCases: readonly UseCaseResult[];
  readonly questions: readonly Question[];
}

/** A committed benchmark run that has page data (from results/index.json). */
export interface BenchmarkRunRef {
  readonly runId: string;
  readonly started: string;
  readonly version: string;
  /** A trend point: prod, default tools, 3 trials, every member present. */
  readonly canonical: boolean;
  readonly pagePath: string;
}
