import type {
  BenchmarkPage,
  GroupStats,
  Question,
  UseCaseResult,
} from "../../model/types";

export function makeStats(overrides: Partial<GroupStats> = {}): GroupStats {
  return {
    scored: 10,
    errors: 0,
    passed: 6,
    majority: 0.6,
    everyTime: 0.4,
    anyTime: 0.8,
    failureModes: { retrieval: 3, explanation: 1 },
    ...overrides,
  };
}

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "ch-mon-001",
    uid: "0123456789abcdef",
    benchmarkId: "bm26-001",
    type: "monitoring",
    cohort: "recent_presence",
    difficulty: "",
    query: "Any alerts in Pará this week?",
    verdict: "pass",
    trialsRight: [true, true, true],
    consistent: true,
    primaryFailure: null,
    failedChecks: [],
    expected: { aoi_ids: "BRA.14" },
    drafted: false,
    attempts: [null, null, null],
    traceUrl: null,
    place: "Sub-national area",
    useCases: ["UC1"],
    synthetic: false,
    ...overrides,
  };
}

export function makeUseCase(
  overrides: Partial<UseCaseResult> = {}
): UseCaseResult {
  return {
    key: "UC1",
    label: "Alert monitoring and response",
    stats: makeStats(),
    composition: {
      types: [
        { key: "monitoring", count: 7 },
        { key: "causal", count: 2 },
        { key: "trend", count: 1 },
      ],
      places: [
        { key: "Sub-national area", count: 6 },
        { key: "Protected area", count: 3 },
        { key: "Country", count: 1 },
      ],
      datasets: [
        { key: "Disturbance alerts", count: 8 },
        { key: "Tree cover loss", count: 2 },
      ],
      synthetic: 5,
    },
    ...overrides,
  };
}

export function makePage(
  overrides: Partial<BenchmarkPage> = {}
): BenchmarkPage {
  return {
    run: {
      runId: "20261023T094447Z_prod",
      started: "2026-10-23T09:44:47Z",
      numTrials: 3,
      harnessSha: "5d081a8",
    },
    benchmark: {
      version: "2026-draft-3",
      status: "draft",
      members: 10,
      excluded: 2,
    },
    summary: {
      ...makeStats(),
      consistency: { complete: 6, clean: 4 },
      datasetsCovered: 3,
    },
    stages: [
      { key: "scope", checked: 2, passed: 2, firstFailures: 0 },
      { key: "retrieval", checked: 10, passed: 7, firstFailures: 3 },
      { key: "analysis", checked: 4, passed: 4, firstFailures: 0 },
      { key: "explanation", checked: 6, passed: 5, firstFailures: 1 },
      { key: "output", checked: 4, passed: 4, firstFailures: 0 },
    ],
    unattributed: 0,
    types: [],
    unmeasuredTypes: [],
    useCases: [makeUseCase()],
    questions: [makeQuestion()],
    ...overrides,
  };
}
