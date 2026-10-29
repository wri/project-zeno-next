/**
 * Driven adapter implementing `BenchmarkGateway` over GitHub raw, and the
 * only place that knows the page file's snake_case wire shape: it is
 * parsed once here into the normalised types in `model/types.ts` (labels
 * resolved, failure modes zero-filled, question status settled). A schema
 * mismatch, an unknown query type or an unknown use case throws: the page
 * is a derived artefact with a schema_version, so drift is a bug to see,
 * not to paper over.
 */

import { z } from "zod";
import { ATTRIBUTION_ORDER, STAGE_ORDER, USE_CASES } from "../model/config";
import type { BenchmarkGateway } from "../model/benchmark-gateway";
import type {
  Attempt,
  BenchmarkPage,
  BenchmarkRunRef,
  Count,
  GroupStats,
  MeasuredType,
  Question,
  QuestionStatus,
} from "../model/types";
import { versionSet } from "../lib/format";
import { pageUrl } from "./github";

const PAGE_SCHEMA_VERSION = 1;

export class BenchmarkDataUnavailableError extends Error {
  constructor(url: string) {
    super(
      `Benchmark data not found: ${url}. Check the release's commit is ` +
        `pushed to wri/gnw-gold-evals and holds the run's page.`
    );
    this.name = "BenchmarkDataUnavailableError";
  }
}

// ── Wire schemas ───────────────────────────────────────────────────────────

const Stage = z.enum(STAGE_ORDER);
const Attribution = z.enum([...STAGE_ORDER, "unattributed"]);

const RawStats = z.object({
  scored: z.number(),
  errors: z.number(),
  passed: z.number(),
  majority: z.number().nullable(),
  every_time: z.number().nullable(),
  any_time: z.number().nullable(),
  failure_modes: z.partialRecord(Attribution, z.number()),
});

const RawTypeBase = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
});

const RawType = z.discriminatedUnion("measured", [
  RawTypeBase.extend({ measured: z.literal(false) }),
  RawTypeBase.extend({
    measured: z.literal(true),
    ...RawStats.shape,
    example_pass: z.string().nullable(),
    example_fail: z
      .object({ query: z.string(), failed_checks: z.array(z.string()) })
      .nullable(),
  }),
]);

const RawCount = z.tuple([z.string(), z.number()]);

// The page's own use-case label is not read: the names are the FE's.
const RawUseCase = z.object({
  key: z.string(),
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

const RawAttemptError = z.object({
  kind: z.enum(["no_answer", "unscored"]),
  reason: z.string(),
});

const RawQuestion = z.object({
  id: z.string(),
  type: z.string(),
  query: z.string(),
  verdict: z.enum(["pass", "fail", "error", "uncovered"]),
  trials_right: z.array(z.boolean()),
  attempt_errors: z.array(RawAttemptError.nullable()).optional(),
  consistent: z.boolean(),
  primary_failure: Attribution.nullable(),
  failed_checks: z.array(
    z.object({
      check: z.string(),
      stage: z.union([Stage, z.literal("shared")]),
      verdict: z.enum(["pass", "fail"]),
      per_trial: z.array(z.boolean().nullable()),
      actual: z.string().nullable(),
      reason: z.string().nullable(),
    })
  ),
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
    // The page's wording assumes three tries ("2 of 3 tries", "all 3
    // tries"), so a run with another count is refused, not mislabelled.
    num_trials: z.literal(3),
    harness_sha: z.string().nullable(),
  }),
  benchmark: z.looseObject({
    version: z.string(),
    members: z.number(),
    excluded: z.number(),
  }),
  summary: z.looseObject(RawStats.shape),
  stages: z.array(
    z.looseObject({
      key: Stage,
      checked: z.number(),
    })
  ),
  types: z.array(RawType),
  use_cases: z.array(RawUseCase),
  questions: z.array(RawQuestion),
});

// ── Mapping ────────────────────────────────────────────────────────────────

function toStats(raw: z.infer<typeof RawStats>): GroupStats {
  return {
    total: raw.scored + raw.errors,
    scored: raw.scored,
    errors: raw.errors,
    passed: raw.passed,
    failed: raw.scored - raw.passed,
    majority: raw.majority,
    everyTime: raw.every_time,
    anyTime: raw.any_time,
    failureModes: Object.fromEntries(
      ATTRIBUTION_ORDER.map((k) => [k, raw.failure_modes[k] ?? 0])
    ) as GroupStats["failureModes"],
  };
}

function toCounts(
  raw: readonly (readonly [string, number])[],
  label: (key: string) => string = (key) => key
): Count[] {
  return raw.map(([key, count]) => ({ key, label: label(key), count }));
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

function statusOf(raw: z.infer<typeof RawQuestion>): QuestionStatus {
  if (raw.verdict === "error") return "error";
  if (raw.verdict !== "pass") return "fail";
  return raw.consistent ? "pass" : "inconsistent";
}

/**
 * Parse a page file's JSON into the normalised page. Throws on drift.
 * `draft` is the run's release flag: it alone decides whether the page
 * marks the run, or any question, as a draft.
 */
export function parseBenchmarkPage(
  json: unknown,
  draft: boolean
): BenchmarkPage {
  const raw = RawPage.parse(json);
  const typeLabels = new Map(raw.types.map((t) => [t.key, t.label]));
  function typeLabel(key: string): string {
    const label = typeLabels.get(key);
    if (label === undefined) throw new Error(`unknown query type ${key}`);
    return label;
  }
  function useCaseName(key: string): string {
    const useCase = USE_CASES.find((u) => u.key === key);
    if (useCase === undefined) throw new Error(`unknown use case ${key}`);
    return useCase.name;
  }
  const measured: MeasuredType[] = [];
  for (const t of raw.types) {
    if (!t.measured) continue;
    measured.push({
      key: t.key,
      label: t.label,
      description: t.description,
      stats: toStats(t),
      examplePass: t.example_pass,
      exampleFail: t.example_fail && {
        query: t.example_fail.query,
        failedChecks: t.example_fail.failed_checks,
      },
    });
  }
  return {
    run: {
      runId: raw.run.run_id,
      started: raw.run.started,
      numTrials: raw.run.num_trials,
      harnessSha: raw.run.harness_sha,
      draft,
    },
    benchmark: {
      version: raw.benchmark.version,
      set: versionSet(raw.benchmark.version),
      members: raw.benchmark.members,
      excluded: raw.benchmark.excluded,
    },
    summary: toStats(raw.summary),
    stages: raw.stages.map((s) => ({
      key: s.key,
      checked: s.checked,
    })),
    types: measured,
    unmeasuredTypes: raw.types
      .filter((t) => !t.measured)
      .map(({ key, label, description }) => ({ key, label, description })),
    useCases: raw.use_cases.map((u) => ({
      key: u.key,
      label: useCaseName(u.key),
      stats: toStats(u),
      composition: {
        types: toCounts(u.composition.types, typeLabel),
        places: toCounts(u.composition.places),
        datasets: toCounts(u.composition.datasets),
        synthetic: u.composition.synthetic,
      },
    })),
    questions: raw.questions.map(
      (q): Question => ({
        id: q.id,
        type: q.type,
        typeLabel: typeLabel(q.type),
        query: q.query,
        verdict: q.verdict,
        status: statusOf(q),
        trialsRight: q.trials_right,
        primaryFailure: q.primary_failure,
        failedChecks: q.failed_checks.map((f) => ({
          check: f.check,
          stage: f.stage,
          verdict: f.verdict,
          perTrial: f.per_trial,
          actual: f.actual,
          reason: f.reason,
        })),
        expected: q.expected,
        drafted: draft && q.drafted,
        attempts: q.attempts.map(toAttempt),
        attemptErrors: q.attempt_errors ?? q.trials_right.map(() => null),
        traceUrl: q.trace_url,
        place: q.place,
        useCases: q.use_cases,
        synthetic: q.synthetic,
      })
    ),
  };
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class GithubBenchmarkGateway implements BenchmarkGateway {
  constructor(
    private readonly fetchFn: FetchFn = (url, init) => fetch(url, init)
  ) {}

  async page(
    run: BenchmarkRunRef,
    signal?: AbortSignal
  ): Promise<BenchmarkPage> {
    const url = pageUrl(run);
    const response = await this.fetchFn(url, { signal });
    if (response.status === 404) throw new BenchmarkDataUnavailableError(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    const page = parseBenchmarkPage(await response.json(), run.draft);
    if (page.run.runId !== run.runId) {
      throw new Error(`${url} holds run ${page.run.runId}, not ${run.runId}`);
    }
    return page;
  }
}
