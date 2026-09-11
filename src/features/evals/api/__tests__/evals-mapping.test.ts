import { describe, expect, it } from "vitest";
import {
  EvalsDataUnavailableError,
  mapCaseIndexEntry,
  mapCaseRow,
  mapCoverageDoc,
  mapIndexEntry,
  RestEvalsGateway,
} from "../rest-evals-gateway";

// Wire-shape snippets trimmed from real committed artefacts of
// wri/gnw-gold-evals (run 20260831T163347Z_prod and the challenge store).

const WIRE_INDEX_ENTRY = {
  run_id: "20260831T163347Z_prod",
  path: "results/gold/runs/20260831T163347Z_prod.json",
  started: "2026-08-31T16:33:47Z",
  environment: "prod",
  build: "baseline",
  ff: null,
  harness: { repo: "gnw-gold-evals", sha: "28941a8" },
  judge_model: "claude-haiku-4-5",
  num_trials: 3,
  workers: 10,
  trial_timeout: 900.0,
  caseset: "v2",
  caseset_version: "bf5a593d71d658ae",
  buckets: {
    retrieval: {
      dedicated: { passed: 407, evaluated: 438 },
      shared: { passed: 0, evaluated: 0 },
      rows_covered: 103,
    },
    rows_total: 109,
    verdicts: { pass: 94, fail: 15, error: 0, uncovered: 0 },
  },
};

const WIRE_ROW = {
  uid: "138f941308d3dab5",
  id: "ch-quant-067",
  checks: {
    aoi_id_match: 1.0,
    dataset_id_match: 0.0,
    dataset_parameter_match: null,
    answer_traceability: 0.0,
  },
  reasons: { answer_traceability: "exceeding the 2% tolerance" },
  actuals: { dataset_id_match: "8" },
  latency_s: 248.9,
  trace_url: "https://langfuse.example/traces/4e7c4b9c",
  info: { slow: true, threshold_s: 180.0 },
};

const WIRE_MULTITURN_ROW = {
  uid: "f25772290e4699fd",
  id: "mt-001",
  checks: { "t1.clarification_requested": 1.0, "t2.state_delta": 1.0 },
  latency_s: 47.4,
  trials: [{ checks: { "t1.clarification_requested": 1.0 }, latency_s: 43.1 }],
  turns_detail: [
    {
      query: "Show me recent disturbance alerts in Puri",
      reasons: null,
      latency_s: 11.1,
      trace_url: "https://langfuse.example/traces/a615adb6",
    },
  ],
};

const WIRE_CASE_ENTRY = {
  id: "ch-aoi-036",
  uid: "720aaf03a4022ee1",
  set: "aoi",
  group: "acronyms",
  status: "ready",
  difficulty: "hard",
  behaviour: "select",
  query: "Go to the USA",
  expected_fields: ["aoi_ids"],
  implied_checks: ["aoi_id_match"],
};

const WIRE_COVERAGE = {
  store: "challenge",
  caseset_version: "e2340e5caf33e404",
  case_count: 496,
  statuses: { ready: 491, todo: 5 },
  active_count: 496,
  groups: [
    { group: "acronyms", cases: 13, active: 13, statuses: { ready: 13 } },
  ],
  bucket_coverage: {
    retrieval: { dedicated: 453, shared_only: 0 },
    analysis: { dedicated: 0, shared_only: 0 },
    explanation: { dedicated: 30, shared_only: 0 },
    output: { dedicated: 0, shared_only: 0 },
    scope: { dedicated: 26, shared_only: 0 },
  },
  expected_fields: [
    { field: "aoi_ids", cases: 380, switches_on: "aoi_id_match" },
  ],
  dataset_coverage: {
    source: { sha: "31a4d1e", ref: "origin/main", synced: "2026-08-20" },
    datasets: [
      {
        dataset_id: "4",
        dataset_name: "Tree cover loss",
        missing_instructions: [],
        cases: 88,
        answer_graded: 0,
        parameters: [{ name: "canopy_cover", cases: 8 }],
        context_layers: [{ name: "primary_forest", cases: 0 }],
      },
    ],
    unknown_dataset_ids: [],
  },
  multi_turn: { conversations: 0, turns: 0, delta_assertions: {} },
  parked: [
    { id: "ch-aoi-095", status: "todo", group: "expansion", reason: null },
  ],
  known_gaps: {
    unused_expected_fields: ["nudge_options"],
    info_only_checks: ["answer_traceability"],
    catalog_datasets_no_case: ["12"],
    uncovered_parameters: {},
    uncovered_context_layers: { primary_forest: ["4"] },
  },
  targets: {
    meta: { set: "2026-09-01", status: "provisional" },
    overall: 0.7,
    sets: {
      aoi: { overall: 0.7, targets: { acronyms: 0.8 } },
      quantification: { overall: null, targets: {} },
    },
  },
};

describe("mapIndexEntry", () => {
  it("maps headers and the buckets block, filling absent buckets", () => {
    const entry = mapIndexEntry(WIRE_INDEX_ENTRY)!;
    expect(entry.runId).toBe("20260831T163347Z_prod");
    expect(entry.ff).toBeNull();
    expect(entry.numTrials).toBe(3);
    expect(entry.buckets!.verdicts.pass).toBe(94);
    expect(entry.buckets!.buckets.retrieval.dedicated.passed).toBe(407);
    // buckets missing from the wire become empty tallies, never undefined
    expect(entry.buckets!.buckets.scope.dedicated.evaluated).toBe(0);
  });

  it("drops malformed entries instead of blanking the index", () => {
    expect(mapIndexEntry({ path: "x" })).toBeNull();
  });
});

describe("mapCaseRow", () => {
  it("maps a single-turn row with info flag and tri-state checks", () => {
    const row = mapCaseRow(WIRE_ROW)!;
    expect(row.checks.dataset_id_match).toBe(0);
    expect(row.checks.dataset_parameter_match).toBeNull();
    expect(row.slow).toBe(true);
    expect(row.actuals.dataset_id_match).toBe("8");
    expect(row.error).toBeNull();
    expect(row.trials).toEqual([]);
  });

  it("maps multi-turn rows with prefixed checks and turn details", () => {
    const row = mapCaseRow(WIRE_MULTITURN_ROW)!;
    expect(row.checks["t2.state_delta"]).toBe(1);
    expect(row.turnsDetail[0].query).toContain("Puri");
    expect(row.turnsDetail[0].reasons).toEqual({});
    expect(row.trials[0].latencyS).toBe(43.1);
  });

  it("drops rows without a uid", () => {
    expect(mapCaseRow({ id: "x" })).toBeNull();
  });
});

describe("mapCaseIndexEntry", () => {
  it("maps optional challenge fields", () => {
    const entry = mapCaseIndexEntry(WIRE_CASE_ENTRY)!;
    expect(entry).toMatchObject({
      id: "ch-aoi-036",
      set: "aoi",
      difficulty: "hard",
      behaviour: "select",
      query: "Go to the USA",
      expectedFields: ["aoi_ids"],
      impliedChecks: ["aoi_id_match"],
    });
  });

  it("leaves absent optionals absent (GOLD cases have no set)", () => {
    const entry = mapCaseIndexEntry({
      id: "1-001",
      uid: "33251684549f20a2",
      group: "direct",
      status: "done",
      query: "q",
      expected_fields: [],
    })!;
    expect("set" in entry).toBe(false);
    expect("difficulty" in entry).toBe(false);
  });
});

describe("mapCoverageDoc", () => {
  const doc = mapCoverageDoc(WIRE_COVERAGE);

  it("maps counts, buckets and targets", () => {
    expect(doc.caseCount).toBe(496);
    expect(doc.bucketCoverage.retrieval).toEqual({
      dedicated: 453,
      sharedOnly: 0,
    });
    expect(doc.targets!.overall).toBe(0.7);
    expect(doc.targets!.sets.aoi.targets.acronyms).toBe(0.8);
    expect(doc.targets!.sets.quantification.overall).toBeNull();
  });

  it("maps dataset coverage and known gaps", () => {
    expect(doc.datasetCoverage!.datasets[0]).toMatchObject({
      datasetId: "4",
      answerGraded: 0,
    });
    expect(doc.knownGaps.uncoveredContextLayers).toEqual({
      primary_forest: ["4"],
    });
    expect(doc.parked[0].reason).toBeNull();
  });

  it("tolerates a v2 doc without targets", () => {
    expect(
      mapCoverageDoc({ ...WIRE_COVERAGE, targets: null }).targets
    ).toBeNull();
  });
});

describe("RestEvalsGateway", () => {
  function gatewayReturning(status: number, body?: unknown) {
    return new RestEvalsGateway(async () =>
      body === undefined
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), { status })
    );
  }

  it("parses the run index through the wire schema", async () => {
    const gateway = gatewayReturning(200, {
      schema_version: 1,
      sets: { gold: [WIRE_INDEX_ENTRY], challenge: [] },
    });
    const index = await gateway.runIndex();
    expect(index.gold).toHaveLength(1);
    expect(index.challenge).toEqual([]);
  });

  it("raises a targeted error on 404 (artefact not on the pinned branch)", async () => {
    await expect(gatewayReturning(404).runIndex()).rejects.toBeInstanceOf(
      EvalsDataUnavailableError
    );
  });

  it("raises on other HTTP failures", async () => {
    await expect(gatewayReturning(500).runIndex()).rejects.toThrow("HTTP 500");
  });
});
