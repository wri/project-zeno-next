import { describe, expect, it } from "vitest";
import {
  BenchmarkDataUnavailableError,
  GithubBenchmarkGateway,
  parseBenchmarkPage,
} from "../github-benchmark-gateway";
import type { BenchmarkRunRef } from "../../model/types";

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
  it("normalises the wire page once: settled stats, resolved labels and status", () => {
    const page = parseBenchmarkPage(WIRE_PAGE, true);
    expect(page.summary).toMatchObject({ everyTime: 0, total: 2, failed: 1 });
    expect(page.summary.failureModes).toEqual({
      scope: 0,
      retrieval: 1,
      analysis: 0,
      explanation: 0,
      output: 0,
      unattributed: 0,
    });
    expect(page.benchmark).toMatchObject({ set: "2026" });
    expect(page.types.map((t) => t.key)).toEqual(["monitoring"]);
    expect(page.unmeasuredTypes.map((t) => t.key)).toEqual(["refusal"]);
    expect(page.types[0].exampleFail?.failedChecks).toEqual(["aoi_id_match"]);
    // The FE's use-case name, not the label the page carries.
    expect(page.useCases[0].label).toBe("Monitor and respond to change");
    expect(page.useCases[0].composition.types).toEqual([
      { key: "monitoring", label: "Monitoring", count: 2 },
    ]);
    const [q] = page.questions;
    expect(q).toMatchObject({
      typeLabel: "Monitoring",
      status: "inconsistent",
    });
    expect(q.failedChecks[0].perTrial).toEqual([true, true, false]);
    expect(q.attempts[0]).toMatchObject({
      datasetId: "11",
      aoiIds: ["BRA.14_1"],
      dates: ["2026-09-23", null],
    });
    expect(q.attempts[1]).toBeNull();
    // A page from before 27 Oct 2026 carries no attempt errors.
    expect(q.attemptErrors).toEqual([null, null, null]);
  });

  it("reads attempts that got no reply", () => {
    const [q] = WIRE_PAGE.questions;
    const page = parseBenchmarkPage(
      {
        ...WIRE_PAGE,
        questions: [
          {
            ...q,
            attempt_errors: [
              null,
              { kind: "no_answer", reason: "ReadTimeout" },
              null,
            ],
          },
        ],
      },
      true
    );
    expect(page.questions[0].attemptErrors[1]).toEqual({
      kind: "no_answer",
      reason: "ReadTimeout",
    });
  });

  it("marks nothing as a draft on a run not released as one", () => {
    const page = parseBenchmarkPage(WIRE_PAGE, false);
    expect(page.run.draft).toBe(false);
    expect(page.questions.map((q) => q.drafted)).toEqual([false]);
    expect(parseBenchmarkPage(WIRE_PAGE, true).questions[0].drafted).toBe(true);
  });

  it("refuses a page written for another schema version", () => {
    expect(() =>
      parseBenchmarkPage({ ...WIRE_PAGE, schema_version: 2 }, true)
    ).toThrow();
  });

  it("refuses a run that is not three tries per question", () => {
    expect(() =>
      parseBenchmarkPage(
        { ...WIRE_PAGE, run: { ...WIRE_PAGE.run, num_trials: 5 } },
        true
      )
    ).toThrow();
  });

  it("refuses a question whose type the page does not list", () => {
    const [q] = WIRE_PAGE.questions;
    expect(() =>
      parseBenchmarkPage(
        { ...WIRE_PAGE, questions: [{ ...q, type: "risk" }] },
        true
      )
    ).toThrow(/unknown query type risk/);
  });

  it("refuses a use case the FE has no name for", () => {
    const [uc] = WIRE_PAGE.use_cases;
    expect(() =>
      parseBenchmarkPage(
        { ...WIRE_PAGE, use_cases: [{ ...uc, key: "UC7" }] },
        true
      )
    ).toThrow(/unknown use case UC7/);
  });
});

describe("GithubBenchmarkGateway", () => {
  const RUN: BenchmarkRunRef = {
    runId: "r1",
    label: "October 2026",
    ref: "f7c138e514c4780ed84003b13a7decdfede8ff21",
    draft: true,
  };

  it("reads a run's page at the commit its release pins", async () => {
    const urls: string[] = [];
    const gateway = new GithubBenchmarkGateway(async (url) => {
      urls.push(url);
      return new Response(JSON.stringify(WIRE_PAGE), { status: 200 });
    });
    const page = await gateway.page(RUN);
    expect(page.run.runId).toBe("r1");
    expect(urls).toEqual([
      "https://raw.githubusercontent.com/wri/gnw-gold-evals/f7c138e514c4780ed84003b13a7decdfede8ff21/results/benchmark/pages/r1.json",
    ]);
  });

  it("says the data is missing when the commit has no such page", async () => {
    const gateway = new GithubBenchmarkGateway(
      async () => new Response("", { status: 404 })
    );
    await expect(gateway.page(RUN)).rejects.toBeInstanceOf(
      BenchmarkDataUnavailableError
    );
  });

  it("refuses a page that holds another run", async () => {
    const gateway = new GithubBenchmarkGateway(
      async () => new Response(JSON.stringify(WIRE_PAGE), { status: 200 })
    );
    await expect(gateway.page({ ...RUN, runId: "r2" })).rejects.toThrow(
      /holds run r1, not r2/
    );
  });
});
