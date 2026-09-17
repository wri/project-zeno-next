/**
 * Driven adapter implementing `EvalsGateway` over GitHub raw. The only
 * place that knows the ledger's snake_case wire shapes (anti-corruption
 * layer — the raw schemas never leave this file). Tolerant by design:
 * unknown fields pass through zod's loose objects, malformed rows are
 * dropped and logged, and a 404 becomes a targeted error naming the
 * pinned branch (the artefact may simply not be merged there yet).
 */

import { z } from "zod";
import { BUCKETS } from "../model/config";
import type { BucketName } from "../model/config";
import type { EvalsGateway } from "../model/evals-gateway";
import type {
  BucketEntry,
  BucketsBlock,
  CaseIndexEntry,
  CaseRow,
  CoverageDoc,
  EvalSet,
  RunDetail,
  RunHeader,
  RunIndex,
  RunSummary,
} from "../model/types";
import {
  casesIndexPath,
  coveragePath,
  EVALS_DATA_BRANCH,
  rawUrl,
  RUN_INDEX_PATH,
} from "./github";

export class EvalsDataUnavailableError extends Error {
  constructor(public readonly url: string) {
    super(
      `Eval data artefact not found: ${url}. The dashboard reads branch ` +
        `"${EVALS_DATA_BRANCH}" of wri/gnw-gold-evals — if the artefact was ` +
        `recently added, it may not be merged to that branch yet.`
    );
    this.name = "EvalsDataUnavailableError";
  }
}

// ── Raw wire schemas ───────────────────────────────────────────────────────────

const ChecksSchema = z.record(z.string(), z.number().nullable());

const RawTally = z.object({
  passed: z.coerce.number().default(0),
  evaluated: z.coerce.number().default(0),
});

const RawBucketEntry = z.looseObject({
  dedicated: RawTally.default({ passed: 0, evaluated: 0 }),
  shared: RawTally.default({ passed: 0, evaluated: 0 }),
  rows_covered: z.coerce.number().default(0),
});

const RawVerdicts = z.object({
  pass: z.coerce.number().default(0),
  fail: z.coerce.number().default(0),
  error: z.coerce.number().default(0),
  uncovered: z.coerce.number().default(0),
});

const RawBucketsBlock = z.looseObject({
  rows_total: z.coerce.number().default(0),
  verdicts: RawVerdicts.default({ pass: 0, fail: 0, error: 0, uncovered: 0 }),
  retrieval: RawBucketEntry.optional(),
  analysis: RawBucketEntry.optional(),
  explanation: RawBucketEntry.optional(),
  output: RawBucketEntry.optional(),
  scope: RawBucketEntry.optional(),
});

const RawHeader = z.looseObject({
  run_id: z.string(),
  started: z.string().default(""),
  environment: z.string().default(""),
  build: z.string().default(""),
  ff: z.string().nullish(),
  num_trials: z.coerce.number().default(1),
  caseset: z.string().default(""),
  caseset_version: z.string().default(""),
  judge_model: z.string().nullish(),
  workers: z.coerce.number().nullish(),
  trial_timeout: z.coerce.number().nullish(),
  resumed: z.boolean().default(false),
});

const RawIndexEntry = RawHeader.extend({
  path: z.string(),
  buckets: RawBucketsBlock.nullish(),
});

const RawIndex = z.looseObject({
  sets: z.looseObject({
    gold: z.array(z.unknown()).default([]),
    challenge: z.array(z.unknown()).default([]),
  }),
});

const RawTrial = z.looseObject({
  checks: ChecksSchema.default({}),
  latency_s: z.coerce.number().nullish(),
});

const RawTurnDetail = z.looseObject({
  query: z.string().default(""),
  reasons: z.record(z.string(), z.coerce.string()).nullish(),
  latency_s: z.coerce.number().nullish(),
  trace_url: z.string().nullish(),
});

const RawCaseRow = z.looseObject({
  uid: z.string(),
  id: z.string().default(""),
  checks: ChecksSchema.default({}),
  reasons: z.record(z.string(), z.coerce.string()).default({}),
  actuals: z.record(z.string(), z.coerce.string()).default({}),
  latency_s: z.coerce.number().nullish(),
  trace_url: z.string().nullish(),
  trials: z.array(RawTrial).default([]),
  turns_detail: z.array(RawTurnDetail).default([]),
  error: z.string().nullish(),
  judge_errors: z.array(z.unknown()).default([]),
  stale_case: z.boolean().default(false),
  info: z.looseObject({ slow: z.boolean().default(false) }).nullish(),
});

const RawRun = RawHeader.extend({
  results: z.array(z.unknown()).default([]),
  buckets: RawBucketsBlock.nullish(),
});

const RawCaseIndexEntry = z.looseObject({
  id: z.string(),
  uid: z.string(),
  set: z.string().optional(),
  group: z.string().default(""),
  status: z.string().default(""),
  difficulty: z.string().optional(),
  behaviour: z.string().optional(),
  query: z.string().optional(),
  turns: z.array(z.string()).optional(),
  expected_fields: z.array(z.string()).default([]),
  implied_checks: z.array(z.string()).default([]),
});

const RawCasesIndex = z.looseObject({
  cases: z.array(z.unknown()).default([]),
});

const RawTargets = z.looseObject({
  overall: z.number().nullish(),
  meta: z.record(z.string(), z.coerce.string()).default({}),
  sets: z
    .record(
      z.string(),
      z.looseObject({
        overall: z.number().nullish(),
        targets: z.record(z.string(), z.number()).default({}),
      })
    )
    .default({}),
});

const RawCoverageGroup = z.looseObject({
  group: z.string().default(""),
  cases: z.coerce.number().default(0),
  active: z.coerce.number().default(0),
  statuses: z.record(z.string(), z.coerce.number()).default({}),
});

const RawBucketCoverage = z.looseObject({
  dedicated: z.coerce.number().default(0),
  shared_only: z.coerce.number().default(0),
});

const RawDatasetRow = z.looseObject({
  dataset_id: z.coerce.string(),
  dataset_name: z.string().default(""),
  missing_instructions: z.array(z.string()).default([]),
  cases: z.coerce.number().default(0),
  answer_graded: z.coerce.number().default(0),
  parameters: z
    .array(
      z.looseObject({
        name: z.string(),
        cases: z.coerce.number().default(0),
      })
    )
    .default([]),
  context_layers: z
    .array(
      z.looseObject({
        name: z.string(),
        cases: z.coerce.number().default(0),
      })
    )
    .default([]),
});

const RawDatasetCoverage = z.looseObject({
  source: z
    .looseObject({
      sha: z.string().default(""),
      ref: z.string().default(""),
      synced: z.string().default(""),
    })
    .nullish(),
  datasets: z.array(RawDatasetRow).default([]),
  unknown_dataset_ids: z
    .array(
      z.looseObject({
        dataset_id: z.coerce.string(),
        cases: z.coerce.number().default(0),
      })
    )
    .default([]),
});

const RawKnownGaps = z.looseObject({
  unused_expected_fields: z.array(z.string()).default([]),
  info_only_checks: z.array(z.string()).default([]),
  catalog_datasets_no_case: z.array(z.string()).default([]),
  uncovered_parameters: z.record(z.string(), z.array(z.string())).default({}),
  uncovered_context_layers: z
    .record(z.string(), z.array(z.string()))
    .default({}),
});

const RawCoverageDoc = z.looseObject({
  store: z.string().default(""),
  caseset_version: z.string().default(""),
  case_count: z.coerce.number().default(0),
  statuses: z.record(z.string(), z.coerce.number()).default({}),
  active_count: z.coerce.number().default(0),
  groups: z.array(RawCoverageGroup).default([]),
  bucket_coverage: z.record(z.string(), RawBucketCoverage).default({}),
  expected_fields: z
    .array(
      z.looseObject({
        field: z.string(),
        cases: z.coerce.number().default(0),
        switches_on: z.string().default(""),
      })
    )
    .default([]),
  dataset_coverage: RawDatasetCoverage.nullish(),
  multi_turn: z
    .looseObject({
      conversations: z.coerce.number().default(0),
      turns: z.coerce.number().default(0),
      delta_assertions: z.record(z.string(), z.coerce.number()).default({}),
    })
    .default({ conversations: 0, turns: 0, delta_assertions: {} }),
  parked: z
    .array(
      z.looseObject({
        id: z.string(),
        status: z.string().default(""),
        group: z.string().default(""),
        reason: z.string().nullish(),
      })
    )
    .default([]),
  known_gaps: RawKnownGaps.default({
    unused_expected_fields: [],
    info_only_checks: [],
    catalog_datasets_no_case: [],
    uncovered_parameters: {},
    uncovered_context_layers: {},
  }),
  targets: RawTargets.nullish(),
});

// ── Wire -> domain mappers ─────────────────────────────────────────────────────

const EMPTY_ENTRY: BucketEntry = {
  dedicated: { passed: 0, evaluated: 0 },
  shared: { passed: 0, evaluated: 0 },
  rowsCovered: 0,
};

function mapBuckets(
  raw: z.infer<typeof RawBucketsBlock> | null | undefined
): BucketsBlock | null {
  if (!raw) return null;
  const buckets = {} as Record<BucketName, BucketEntry>;
  for (const bucket of BUCKETS) {
    const entry = raw[bucket];
    buckets[bucket] = entry
      ? {
          dedicated: entry.dedicated,
          shared: entry.shared,
          rowsCovered: entry.rows_covered,
        }
      : EMPTY_ENTRY;
  }
  return { buckets, rowsTotal: raw.rows_total, verdicts: raw.verdicts };
}

function mapHeader(raw: z.infer<typeof RawHeader>): RunHeader {
  return {
    runId: raw.run_id,
    started: raw.started,
    environment: raw.environment,
    build: raw.build,
    ff: raw.ff ?? null,
    numTrials: raw.num_trials,
    caseset: raw.caseset,
    casesetVersion: raw.caseset_version,
    judgeModel: raw.judge_model ?? null,
    workers: raw.workers ?? null,
    trialTimeout: raw.trial_timeout ?? null,
    resumed: raw.resumed,
  };
}

export function mapIndexEntry(raw: unknown): RunSummary | null {
  const parsed = RawIndexEntry.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[RestEvalsGateway] dropped malformed index entry",
      parsed.error.issues
    );
    return null;
  }
  return {
    ...mapHeader(parsed.data),
    path: parsed.data.path,
    buckets: mapBuckets(parsed.data.buckets),
  };
}

export function mapCaseRow(raw: unknown): CaseRow | null {
  const parsed = RawCaseRow.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[RestEvalsGateway] dropped malformed run row",
      parsed.error.issues
    );
    return null;
  }
  const row = parsed.data;
  return {
    uid: row.uid,
    id: row.id,
    checks: row.checks,
    reasons: row.reasons,
    actuals: row.actuals,
    latencyS: row.latency_s ?? null,
    traceUrl: row.trace_url ?? null,
    trials: row.trials.map((trial) => ({
      checks: trial.checks,
      latencyS: trial.latency_s ?? null,
    })),
    turnsDetail: row.turns_detail.map((turn) => ({
      query: turn.query,
      reasons: turn.reasons ?? {},
      latencyS: turn.latency_s ?? null,
      traceUrl: turn.trace_url ?? null,
    })),
    error: row.error ?? null,
    judgeErrors: row.judge_errors.map((e) => String(e)),
    staleCase: row.stale_case,
    slow: row.info?.slow ?? false,
  };
}

export function mapCaseIndexEntry(raw: unknown): CaseIndexEntry | null {
  const parsed = RawCaseIndexEntry.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[RestEvalsGateway] dropped malformed cases_index entry",
      parsed.error.issues
    );
    return null;
  }
  const entry = parsed.data;
  return {
    id: entry.id,
    uid: entry.uid,
    ...(entry.set ? { set: entry.set } : {}),
    group: entry.group,
    status: entry.status,
    ...(entry.difficulty ? { difficulty: entry.difficulty } : {}),
    ...(entry.behaviour ? { behaviour: entry.behaviour } : {}),
    ...(entry.query !== undefined ? { query: entry.query } : {}),
    ...(entry.turns ? { turns: entry.turns } : {}),
    expectedFields: entry.expected_fields,
    impliedChecks: entry.implied_checks,
  };
}

export function mapCoverageDoc(raw: unknown): CoverageDoc {
  const doc = RawCoverageDoc.parse(raw);
  const bucketCoverage = {} as CoverageDoc["bucketCoverage"];
  for (const bucket of BUCKETS) {
    const cov = doc.bucket_coverage[bucket];
    bucketCoverage[bucket] = {
      dedicated: cov?.dedicated ?? 0,
      sharedOnly: cov?.shared_only ?? 0,
    };
  }
  return {
    store: doc.store,
    casesetVersion: doc.caseset_version,
    caseCount: doc.case_count,
    statuses: doc.statuses,
    activeCount: doc.active_count,
    groups: doc.groups,
    bucketCoverage,
    expectedFields: doc.expected_fields.map((f) => ({
      field: f.field,
      cases: f.cases,
      switchesOn: f.switches_on,
    })),
    datasetCoverage: doc.dataset_coverage
      ? {
          source: doc.dataset_coverage.source ?? null,
          datasets: doc.dataset_coverage.datasets.map((d) => ({
            datasetId: d.dataset_id,
            datasetName: d.dataset_name,
            missingInstructions: d.missing_instructions,
            cases: d.cases,
            answerGraded: d.answer_graded,
            parameters: d.parameters,
            contextLayers: d.context_layers,
          })),
          unknownDatasetIds: doc.dataset_coverage.unknown_dataset_ids.map(
            (u) => ({ datasetId: u.dataset_id, cases: u.cases })
          ),
        }
      : null,
    multiTurn: {
      conversations: doc.multi_turn.conversations,
      turns: doc.multi_turn.turns,
      deltaAssertions: doc.multi_turn.delta_assertions,
    },
    parked: doc.parked.map((p) => ({
      id: p.id,
      status: p.status,
      group: p.group,
      reason: p.reason ?? null,
    })),
    knownGaps: {
      unusedExpectedFields: doc.known_gaps.unused_expected_fields,
      infoOnlyChecks: doc.known_gaps.info_only_checks,
      catalogDatasetsNoCase: doc.known_gaps.catalog_datasets_no_case,
      uncoveredParameters: doc.known_gaps.uncovered_parameters,
      uncoveredContextLayers: doc.known_gaps.uncovered_context_layers,
    },
    targets: doc.targets
      ? {
          overall: doc.targets.overall ?? null,
          meta: doc.targets.meta,
          sets: Object.fromEntries(
            Object.entries(doc.targets.sets).map(([name, block]) => [
              name,
              { overall: block.overall ?? null, targets: block.targets },
            ])
          ),
        }
      : null,
  };
}

// ── Adapter ────────────────────────────────────────────────────────────────────

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class RestEvalsGateway implements EvalsGateway {
  constructor(
    private readonly fetchFn: FetchFn = (url, init) => fetch(url, init)
  ) {}

  private async getJson(
    repoPath: string,
    signal?: AbortSignal
  ): Promise<unknown> {
    const url = rawUrl(repoPath);
    const response = await this.fetchFn(url, { signal });
    if (response.status === 404) throw new EvalsDataUnavailableError(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }

  async runIndex(signal?: AbortSignal): Promise<RunIndex> {
    const body = RawIndex.parse(await this.getJson(RUN_INDEX_PATH, signal));
    const mapSet = (rows: unknown[]) =>
      rows.map(mapIndexEntry).filter((entry): entry is RunSummary => !!entry);
    return {
      gold: mapSet(body.sets.gold),
      challenge: mapSet(body.sets.challenge),
    };
  }

  async run(path: string, signal?: AbortSignal): Promise<RunDetail> {
    const body = RawRun.parse(await this.getJson(path, signal));
    return {
      ...mapHeader(body),
      rows: body.results.map(mapCaseRow).filter((row): row is CaseRow => !!row),
      buckets: mapBuckets(body.buckets),
    };
  }

  async coverage(set: EvalSet, signal?: AbortSignal): Promise<CoverageDoc> {
    return mapCoverageDoc(await this.getJson(coveragePath(set), signal));
  }

  async casesIndex(
    set: EvalSet,
    signal?: AbortSignal
  ): Promise<CaseIndexEntry[]> {
    const body = RawCasesIndex.parse(
      await this.getJson(casesIndexPath(set), signal)
    );
    return body.cases
      .map(mapCaseIndexEntry)
      .filter((entry): entry is CaseIndexEntry => !!entry);
  }
}
