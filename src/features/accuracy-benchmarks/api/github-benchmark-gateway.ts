/**
 * Driven adapter implementing `BenchmarkGateway` over GitHub raw, and the
 * only place that knows the page file's snake_case wire shape: it is
 * parsed once here into the normalised types in `model/types.ts`. A
 * schema mismatch throws (the page is a derived artefact with a
 * schema_version, so drift is a bug to see, not to paper over).
 */

import { z } from "zod";
import type { BenchmarkGateway } from "../model/benchmark-gateway";
import type {
  Attempt,
  BenchmarkPage,
  BenchmarkRunRef,
  Count,
  GroupStats,
  MeasuredType,
  Question,
  StageCheck,
  StageKey,
  UnmeasuredType,
} from "../model/types";
import { BENCHMARK_DATA_BRANCH, RUN_INDEX_PATH, rawUrl } from "./github";

export const PAGE_SCHEMA_VERSION = 1;

export class BenchmarkDataUnavailableError extends Error {
  constructor(public readonly url: string) {
    super(
      `Benchmark data not found: ${url}. The page reads branch ` +
        `"${BENCHMARK_DATA_BRANCH}" of wri/gnw-gold-evals; a recently added ` +
        `file may not be merged to that branch yet.`
    );
    this.name = "BenchmarkDataUnavailableError";
  }
}

// ── Wire schemas ───────────────────────────────────────────────────────────

const Stage = z.enum([
  "scope",
  "retrieval",
  "analysis",
  "explanation",
  "output",
]);
const Attribution = z.enum([...Stage.options, "unattributed"]);

const RawIndexRun = z.looseObject({
  run_id: z.string(),
  started: z.string(),
  canonical: z.boolean().default(false),
  benchmark: z.looseObject({ version: z.string() }),
  page: z.string().optional(),
});

const RawIndex = z.looseObject({
  sets: z.looseObject({ benchmark: z.array(RawIndexRun).default([]) }),
});

const RawStats = z.object({
  scored: z.number(),
  errors: z.number(),
  passed: z.number(),
  majority: z.number().nullable(),
  every_time: z.number().nullable(),
  any_time: z.number().nullable(),
  failure_modes: z.partialRecord(Attribution, z.number()),
});

const RawStageCheck = z.object({
  checked: z.number(),
  passed: z.number(),
  first_failures: z.number(),
});

const RawCount = z.tuple([z.string(), z.number()]);

const RawType = z.looseObject({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  measured: z.boolean(),
  ...RawStats.partial().shape,
  stage_checks: z.record(Stage, RawStageCheck).optional(),
  example_pass: z.string().nullable().optional(),
  example_fail: z
    .object({ query: z.string(), failed_checks: z.array(z.string()) })
    .nullable()
    .optional(),
});

const RawUseCase = z.object({
  key: z.string(),
  label: z.string(),
  ...RawStats.shape,
  composition: z.object({
    types: z.array(RawCount),
    places: z.array(RawCount),
    datasets: z.array(RawCount),
    synthetic: z.number(),
  }),
});

const RawAttempt = z.object({
  tools: z.array(z.string()),
  aoi_ids: z.array(z.string().nullable()),
  dataset_id: z.union([z.string(), z.number()]).nullable(),
  context_layer: z.string().nullable(),
  dates: z.tuple([z.string(), z.string().nullable()]).nullable(),
  nudge: z.string().nullable(),
  charts: z.number(),
  answer_excerpt: z.string(),
});

const RawFailedCheck = z.object({
  check: z.string(),
  stage: z.union([Stage, z.literal("shared")]),
  verdict: z.enum(["pass", "fail"]),
  per_trial: z.array(z.boolean().nullable()),
  actual: z.string().nullable(),
  reason: z.string().nullable(),
});

const RawQuestion = z.object({
  id: z.string(),
  uid: z.string(),
  benchmark_id: z.string(),
  type: z.string(),
  cohort: z.string(),
  difficulty: z.string(),
  query: z.string(),
  verdict: z.enum(["pass", "fail", "error", "uncovered"]),
  trials_right: z.array(z.boolean()),
  consistent: z.boolean(),
  primary_failure: Attribution.nullable(),
  failed_checks: z.array(RawFailedCheck),
  expected: z.record(z.string(), z.string()),
  drafted: z.boolean(),
  attempts: z.array(RawAttempt.nullable()),
  trace_url: z.string().nullable(),
  place: z.string(),
  use_cases: z.array(z.string()),
  synthetic: z.boolean(),
});

const RawPage = z.looseObject({
  schema_version: z.literal(PAGE_SCHEMA_VERSION),
  run: z.looseObject({
    run_id: z.string(),
    started: z.string(),
    num_trials: z.number(),
    harness_sha: z.string().nullable(),
  }),
  benchmark: z.looseObject({
    version: z.string(),
    status: z.enum(["draft", "frozen", "retired"]),
    members: z.number(),
    excluded: z.number(),
  }),
  summary: z.looseObject({
    ...RawStats.shape,
    consistency: z.object({ complete: z.number(), clean: z.number() }),
    datasets_covered: z.number(),
  }),
  stages: z.array(z.object({ key: Stage, ...RawStageCheck.shape })),
  unattributed: z.number(),
  types: z.array(RawType),
  use_cases: z.array(RawUseCase),
  questions: z.array(RawQuestion),
});

// ── Mapping ────────────────────────────────────────────────────────────────

type RawStatsT = z.infer<typeof RawStats>;

function toStats(raw: RawStatsT): GroupStats {
  return {
    scored: raw.scored,
    errors: raw.errors,
    passed: raw.passed,
    majority: raw.majority,
    everyTime: raw.every_time,
    anyTime: raw.any_time,
    failureModes: raw.failure_modes,
  };
}

function toStageCheck(raw: z.infer<typeof RawStageCheck>): StageCheck {
  return {
    checked: raw.checked,
    passed: raw.passed,
    firstFailures: raw.first_failures,
  };
}

function toCounts(raw: readonly (readonly [string, number])[]): Count[] {
  return raw.map(([key, count]) => ({ key, count }));
}

function toType(raw: z.infer<typeof RawType>): MeasuredType | UnmeasuredType {
  const base = { key: raw.key, label: raw.label, description: raw.description };
  if (!raw.measured) return base;
  const stats = RawStats.parse(raw);
  if (!raw.stage_checks) {
    throw new Error(`measured type ${raw.key} has no stage_checks`);
  }
  const stageChecks = Object.fromEntries(
    Object.entries(raw.stage_checks).map(([k, v]) => [k, toStageCheck(v)])
  ) as Record<StageKey, StageCheck>;
  return {
    ...base,
    stats: toStats(stats),
    stageChecks,
    examplePass: raw.example_pass ?? null,
    exampleFail: raw.example_fail
      ? {
          query: raw.example_fail.query,
          failedChecks: raw.example_fail.failed_checks,
        }
      : null,
  };
}

function toAttempt(raw: z.infer<typeof RawAttempt> | null): Attempt | null {
  if (!raw) return null;
  return {
    tools: raw.tools,
    aoiIds: raw.aoi_ids.filter((id): id is string => !!id),
    datasetId: raw.dataset_id == null ? null : String(raw.dataset_id),
    contextLayer: raw.context_layer,
    dates: raw.dates,
    nudge: raw.nudge,
    charts: raw.charts,
    answerExcerpt: raw.answer_excerpt,
  };
}

function toQuestion(raw: z.infer<typeof RawQuestion>): Question {
  return {
    id: raw.id,
    uid: raw.uid,
    benchmarkId: raw.benchmark_id,
    type: raw.type,
    cohort: raw.cohort,
    difficulty: raw.difficulty,
    query: raw.query,
    verdict: raw.verdict,
    trialsRight: raw.trials_right,
    consistent: raw.consistent,
    primaryFailure: raw.primary_failure,
    failedChecks: raw.failed_checks.map((f) => ({
      check: f.check,
      stage: f.stage,
      verdict: f.verdict,
      perTrial: f.per_trial,
      actual: f.actual,
      reason: f.reason,
    })),
    expected: raw.expected,
    drafted: raw.drafted,
    attempts: raw.attempts.map(toAttempt),
    traceUrl: raw.trace_url,
    place: raw.place,
    useCases: raw.use_cases,
    synthetic: raw.synthetic,
  };
}

/** Parse a page file's JSON into the normalised page. Throws on drift. */
export function parseBenchmarkPage(json: unknown): BenchmarkPage {
  const raw = RawPage.parse(json);
  const types = raw.types.map(toType);
  return {
    run: {
      runId: raw.run.run_id,
      started: raw.run.started,
      numTrials: raw.run.num_trials,
      harnessSha: raw.run.harness_sha ?? "",
    },
    benchmark: {
      version: raw.benchmark.version,
      status: raw.benchmark.status,
      members: raw.benchmark.members,
      excluded: raw.benchmark.excluded,
    },
    summary: {
      ...toStats(raw.summary),
      consistency: raw.summary.consistency,
      datasetsCovered: raw.summary.datasets_covered,
    },
    stages: raw.stages.map((s) => ({ key: s.key, ...toStageCheck(s) })),
    unattributed: raw.unattributed,
    types: types.filter((t): t is MeasuredType => "stats" in t),
    unmeasuredTypes: types.filter((t) => !("stats" in t)),
    useCases: raw.use_cases.map((u) => ({
      key: u.key,
      label: u.label,
      stats: toStats(u),
      composition: {
        types: toCounts(u.composition.types),
        places: toCounts(u.composition.places),
        datasets: toCounts(u.composition.datasets),
        synthetic: u.composition.synthetic,
      },
    })),
    questions: raw.questions.map(toQuestion),
  };
}

/** Benchmark runs with committed page data, oldest first. */
export function parseBenchmarkRuns(json: unknown): BenchmarkRunRef[] {
  return RawIndex.parse(json)
    .sets.benchmark.filter((r) => !!r.page)
    .map((r) => ({
      runId: r.run_id,
      started: r.started,
      version: r.benchmark.version,
      canonical: r.canonical,
      pagePath: r.page!,
    }))
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class GithubBenchmarkGateway implements BenchmarkGateway {
  constructor(
    private readonly fetchFn: FetchFn = (url, init) => fetch(url, init)
  ) {}

  private async getJson(
    repoPath: string,
    signal?: AbortSignal
  ): Promise<unknown> {
    const url = rawUrl(repoPath);
    const response = await this.fetchFn(url, { signal });
    if (response.status === 404) throw new BenchmarkDataUnavailableError(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }

  async runs(signal?: AbortSignal): Promise<BenchmarkRunRef[]> {
    return parseBenchmarkRuns(await this.getJson(RUN_INDEX_PATH, signal));
  }

  async page(path: string, signal?: AbortSignal): Promise<BenchmarkPage> {
    return parseBenchmarkPage(await this.getJson(path, signal));
  }
}
