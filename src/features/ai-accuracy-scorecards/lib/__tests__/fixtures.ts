import type {
  AttributionKey,
  GroupStats,
  Question,
  UseCaseResult,
} from "../../model/types";

const NO_FAILURES: Record<AttributionKey, number> = {
  scope: 0,
  retrieval: 0,
  analysis: 0,
  explanation: 0,
  output: 0,
  unattributed: 0,
};

export function makeStats(overrides: Partial<GroupStats> = {}): GroupStats {
  return {
    total: 10,
    scored: 10,
    errors: 0,
    passed: 6,
    failed: 4,
    majority: 0.6,
    everyTime: 0.4,
    anyTime: 0.8,
    failureModes: { ...NO_FAILURES, retrieval: 3, explanation: 1 },
    ...overrides,
  };
}

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "ch-mon-001",
    type: "monitoring",
    typeLabel: "Monitoring",
    query: "Any alerts in Pará this week?",
    verdict: "pass",
    status: "pass",
    trialsRight: [true, true, true],
    primaryFailure: null,
    failedChecks: [],
    expected: { aoi_ids: "BRA.14" },
    drafted: false,
    attempts: [null, null, null],
    attemptErrors: [null, null, null],
    traceUrl: null,
    place: "Sub-national area",
    useCases: ["UC1"],
    synthetic: false,
    ...overrides,
  };
}

const count = (key: string, n: number, label = key) => ({
  key,
  label,
  count: n,
});

export function makeUseCase(
  overrides: Partial<UseCaseResult> = {}
): UseCaseResult {
  return {
    key: "UC1",
    label: "Monitor and respond to change",
    stats: makeStats(),
    composition: {
      types: [
        count("monitoring", 7, "Monitoring"),
        count("causal", 2, "Causal"),
        count("trend", 1, "Trend"),
      ],
      places: [
        count("Sub-national area", 6),
        count("Protected area", 3),
        count("Country", 1),
      ],
      datasets: [count("GHG net flux", 8), count("Tree cover loss", 2)],
      synthetic: 5,
    },
    ...overrides,
  };
}
