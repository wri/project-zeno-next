import { describe, expect, it } from "vitest";
import {
  BenchmarkDataUnavailableError,
  GithubBenchmarkGateway,
  parseBenchmarkPage,
  parseBenchmarkRuns,
} from "../github-benchmark-gateway";

const STATS = {
  scored: 2,
  errors: 0,
  passed: 1,
  majority: 0.5,
  every_time: 0,
  any_time: 1,
  failure_modes: { retrieval: 1 },
};

/** A two-question page in the wire shape tools/benchmark_page.py writes. */
const WIRE_PAGE = {
  schema_version: 1,
  generated_by: "tools/benchmark_page.py",
  run: {
    run_id: "r1",
    started: "2026-10-23T09:44:47Z",
    environment: "prod",
    ff: null,
    num_trials: 3,
    harness_sha: "abc",
  },
  benchmark: {
    version: "2026-draft-3",
    status: "draft",
    manifest_sha: "f",
    members: 2,
    excluded: 1,
  },
  summary: {
    ...STATS,
    consistency: { complete: 1, clean: 0 },
    attempt_rates: [0.5, 0.5, 0.5],
    datasets_covered: 1,
  },
  stages: [
    { key: "scope", checked: 0, passed: 0, first_failures: 0 },
    { key: "retrieval", checked: 2, passed: 1, first_failures: 1 },
    { key: "analysis", checked: 0, passed: 0, first_failures: 0 },
    { key: "explanation", checked: 0, passed: 0, first_failures: 0 },
    { key: "output", checked: 0, passed: 0, first_failures: 0 },
  ],
  unattributed: 0,
  types: [
    {
      key: "refusal",
      label: "Refusal",
      description: "declining or asking back",
      measured: false,
    },
    {
      key: "monitoring",
      label: "Monitoring",
      description: "recent alerts in an area",
      measured: true,
      ...STATS,
      stage_checks: {
        scope: { checked: 0, passed: 0, first_failures: 0 },
        retrieval: { checked: 2, passed: 1, first_failures: 1 },
        analysis: { checked: 0, passed: 0, first_failures: 0 },
        explanation: { checked: 0, passed: 0, first_failures: 0 },
        output: { checked: 0, passed: 0, first_failures: 0 },
      },
      example_pass: null,
      example_fail: {
        query: "Alerts in Acre?",
        failed_checks: ["aoi_id_match"],
      },
    },
  ],
  use_cases: [
    {
      key: "UC1",
      label: "Alert monitoring and response",
      ...STATS,
      composition: {
        types: [["monitoring", 2]],
        places: [["Sub-national area", 2]],
        datasets: [["Disturbance alerts", 2]],
        synthetic: 1,
      },
    },
  ],
  questions: [
    {
      id: "ch-mon-001",
      uid: "u1",
      benchmark_id: "bm26-001",
      type: "monitoring",
      cohort: "g",
      difficulty: "",
      query: "Alerts in Pará?",
      verdict: "pass",
      trials_right: [true, true, false],
      consistent: false,
      primary_failure: null,
      failed_checks: [
        {
          check: "aoi_id_match",
          stage: "retrieval",
          verdict: "pass",
          per_trial: [true, true, false],
          actual: "['BRA']",
          reason: null,
        },
      ],
      expected: { aoi_ids: "BRA.14" },
      drafted: true,
      attempts: [
        {
          tools: ["pick_aoi", "pull_data"],
          aoi_ids: ["BRA.14_1", null],
          dataset_id: 11,
          context_layer: null,
          dates: ["2026-09-23", null],
          nudge: null,
          charts: 1,
          answer_excerpt: "Yes, 120 ha.",
        },
        null,
        null,
      ],
      trace_url: "https://langfuse.example/trace/1",
      place: "Sub-national area",
      use_cases: ["UC1"],
      synthetic: true,
    },
  ],
};

describe("parseBenchmarkPage", () => {
  it("normalises the wire page once: camelCase, measured vs unmeasured types, string dataset ids", () => {
    const page = parseBenchmarkPage(WIRE_PAGE);
    expect(page.summary.everyTime).toBe(0);
    expect(page.summary.consistency).toEqual({ complete: 1, clean: 0 });
    expect(page.types.map((t) => t.key)).toEqual(["monitoring"]);
    expect(page.unmeasuredTypes.map((t) => t.key)).toEqual(["refusal"]);
    expect(page.types[0].stageChecks.retrieval.firstFailures).toBe(1);
    expect(page.types[0].exampleFail?.failedChecks).toEqual(["aoi_id_match"]);
    expect(page.useCases[0].composition.places).toEqual([
      { key: "Sub-national area", count: 2 },
    ]);
    const [q] = page.questions;
    expect(q.failedChecks[0].perTrial).toEqual([true, true, false]);
    expect(q.attempts[0]).toMatchObject({
      datasetId: "11",
      aoiIds: ["BRA.14_1"],
      dates: ["2026-09-23", null],
    });
    expect(q.attempts[1]).toBeNull();
  });

  it("refuses a page written for another schema version", () => {
    expect(() =>
      parseBenchmarkPage({ ...WIRE_PAGE, schema_version: 2 })
    ).toThrow();
  });
});

describe("parseBenchmarkRuns", () => {
  it("keeps only benchmark runs with page data, oldest first", () => {
    const runs = parseBenchmarkRuns({
      sets: {
        gold: [{ run_id: "g" }],
        benchmark: [
          {
            run_id: "b2",
            started: "2026-10-23T00:00:00Z",
            canonical: true,
            benchmark: { version: "2026-draft-3" },
            page: "results/benchmark/pages/b2.json",
          },
          {
            run_id: "b1",
            started: "2026-10-01T00:00:00Z",
            canonical: true,
            benchmark: { version: "2026-draft-2" },
          },
          {
            run_id: "b0",
            started: "2026-09-29T00:00:00Z",
            canonical: false,
            benchmark: { version: "2026-draft" },
            page: "results/benchmark/pages/b0.json",
          },
        ],
      },
    });
    expect(runs.map((r) => [r.runId, r.canonical, r.pagePath])).toEqual([
      ["b0", false, "results/benchmark/pages/b0.json"],
      ["b2", true, "results/benchmark/pages/b2.json"],
    ]);
  });
});

describe("GithubBenchmarkGateway", () => {
  it("names the branch when a file is missing", async () => {
    const gateway = new GithubBenchmarkGateway(
      async () => new Response("", { status: 404 })
    );
    await expect(
      gateway.page("results/benchmark/pages/x.json")
    ).rejects.toBeInstanceOf(BenchmarkDataUnavailableError);
  });

  it("fetches and parses a page from GitHub raw", async () => {
    const urls: string[] = [];
    const gateway = new GithubBenchmarkGateway(async (url) => {
      urls.push(url);
      return new Response(JSON.stringify(WIRE_PAGE), { status: 200 });
    });
    const page = await gateway.page("results/benchmark/pages/r1.json");
    expect(page.run.runId).toBe("r1");
    expect(urls[0]).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/wri\/gnw-gold-evals\/[^/]+\/results\/benchmark\/pages\/r1\.json$/
    );
  });
});
