import { describe, expect, it } from "vitest";
import { checkLabel } from "../../model/checks";
import { groupChecks } from "../checks";
import { failureBreakdown, failureFlow, failurePhrase } from "../failures";
import { formatDay, formatMonth, pct, share, versionSet } from "../format";
import { mixSentence } from "../mix";
import { filterQuestions, NO_FILTER } from "../questions";
import { monthsSinceOrigin, pickRun, releasedRuns, trendPoints } from "../runs";
import { tierLines, tiersOf } from "../tiers";
import { RELEASES } from "../../model/releases";
import type { BenchmarkPage, FailedCheck } from "../../model/types";
import { makeQuestion, makeStats, makeUseCase } from "./fixtures";

describe("tiersOf", () => {
  it("splits the cumulative shares into four tiers that sum to the scored total", () => {
    const tiers = tiersOf(
      makeStats({
        scored: 269,
        everyTime: 135 / 269,
        majority: 170 / 269,
        anyTime: 191 / 269,
      })
    );
    expect(tiers.map((t) => [t.key, t.count])).toEqual([
      ["every", 135],
      ["most", 35],
      ["some", 21],
      ["never", 78],
    ]);
    expect(tiers.reduce((sum, t) => sum + t.count, 0)).toBe(269);
    expect(tiers[0].share).toBeCloseTo(135 / 269);
  });

  it("treats a group with no scored question as empty", () => {
    const tiers = tiersOf(
      makeStats({ scored: 0, everyTime: null, majority: null, anyTime: null })
    );
    expect(tiers.every((t) => t.count === 0 && t.share === null)).toBe(true);
  });

  it("words each tier once for labels and tooltips", () => {
    expect(tierLines(makeStats())[0]).toBe("40% accurate every time (4)");
  });
});

describe("failureBreakdown", () => {
  it("lists the non-empty stages in attribution order with their share", () => {
    const stats = makeStats({
      failureModes: {
        scope: 1,
        retrieval: 3,
        analysis: 0,
        explanation: 1,
        output: 0,
        unattributed: 1,
      },
    });
    expect(failureBreakdown(stats).map((m) => [m.key, m.count])).toEqual([
      ["scope", 1],
      ["retrieval", 3],
      ["explanation", 1],
      ["unattributed", 1],
    ]);
    expect(failureBreakdown(stats)[1].share).toBeCloseTo(0.3);
    expect(failurePhrase(stats)).toBe(
      "1 at scope, 3 at retrieval, 1 at explanation, 1 at unattributed"
    );
  });
});

describe("failureFlow", () => {
  const failed = (
    check: string,
    stage: FailedCheck["stage"],
    verdict: FailedCheck["verdict"]
  ): FailedCheck => ({
    check,
    stage,
    verdict,
    perTrial: verdict === "fail" ? [false, false, true] : [true, false, true],
    actual: null,
    reason: null,
  });
  const questions = [
    makeQuestion({ id: "every" }),
    // Right on 2 of 3: wrong only under "every", at its one-try failure.
    makeQuestion({
      id: "most",
      status: "inconsistent",
      trialsRight: [true, false, true],
      failedChecks: [failed("web_fallback", "explanation", "pass")],
    }),
    // Right once: keeps the run's attribution, though an earlier stage
    // failed on one try.
    makeQuestion({
      id: "some",
      verdict: "fail",
      status: "fail",
      trialsRight: [false, false, true],
      primaryFailure: "explanation",
      failedChecks: [
        failed("aoi_id_match", "retrieval", "pass"),
        failed("expected_text_match", "explanation", "fail"),
      ],
    }),
    makeQuestion({
      id: "never",
      verdict: "fail",
      status: "fail",
      trialsRight: [false, false, false],
      primaryFailure: "unattributed",
      failedChecks: [failed("agent_answer", "shared", "fail")],
    }),
    makeQuestion({ id: "error", verdict: "error", status: "error" }),
  ];
  const counts = (standard: Parameters<typeof failureFlow>[1]) => {
    const flow = failureFlow(questions, standard);
    return [flow.accurate, flow.modes.map((m) => [m.key, m.count])];
  };

  it("counts each standard over the scored questions only", () => {
    expect(failureFlow(questions, "every").scored).toBe(4);
    expect(counts("every")).toEqual([
      1,
      [
        ["explanation", 2],
        ["unattributed", 1],
      ],
    ]);
    expect(counts("most")).toEqual([
      2,
      [
        ["explanation", 1],
        ["unattributed", 1],
      ],
    ]);
    expect(counts("some")).toEqual([3, [["unattributed", 1]]]);
  });

  it("gives each failure's and the accurate share of the scored questions", () => {
    const flow = failureFlow(questions, "most");
    expect(flow.modes.find((m) => m.key === "explanation")?.share).toBe(1 / 4);
    expect(flow.accurateShare).toBe(2 / 4);
  });

  it("names the question types each stage's failures came from, most first", () => {
    const wrong = (id: string, type: string) =>
      makeQuestion({
        id,
        type,
        typeLabel: type,
        verdict: "fail",
        status: "fail",
        trialsRight: [false, false, false],
        primaryFailure: "retrieval",
      });
    const flow = failureFlow(
      [wrong("a", "Trend"), wrong("b", "Causal"), wrong("c", "Causal")],
      "every"
    );
    expect(flow.modes[0].types).toEqual([
      { key: "Causal", label: "Causal", count: 2 },
      { key: "Trend", label: "Trend", count: 1 },
    ]);
  });
});

describe("groupChecks", () => {
  it("lists the checks the questions switch on, per step, apart from the tracked and unused ones", () => {
    const groups = groupChecks([
      makeQuestion({ expected: { aoi_ids: "BRA", clarification: "TRUE" } }),
      makeQuestion({ expected: { start_date: "2024-01-01", scope: "" } }),
    ]);
    const keys = (checks: readonly { key: string }[]) =>
      checks.map((c) => c.key);
    const byStage = Object.fromEntries(
      groups.byStage.map((s) => [s.stage, keys(s.checks)])
    );
    expect(byStage.scope).toEqual([
      "clarification_requested",
      "dashboard_created",
    ]);
    expect(byStage.retrieval).toEqual(["aoi_id_match", "date_extraction"]);
    // A shared check sits under both of its steps.
    expect(byStage.output).toContain("dashboard_created");
    expect(keys(groups.tracked)).toEqual([
      "date_coverage",
      "answer_traceability",
    ]);
    // An empty expected field switches nothing on.
    expect(keys(groups.unused)).toContain("scope_match");
    expect(keys(groups.unused)).toContain("charts_answer_judge");
  });

  it("lists the alternative-answer checks under their steps", () => {
    const groups = groupChecks([
      makeQuestion({ expected: { accept_aoi_nudge_offering: "BRA.14" } }),
      makeQuestion({ expected: { accept_blog_sources: "a-post" } }),
    ]);
    const stage = (key: string) =>
      groups.byStage
        .filter((s) => s.checks.some((c) => c.key === key))
        .map((s) => s.stage);
    expect(stage("accepted_nudge_match")).toEqual(["scope"]);
    expect(stage("accepted_blog_match")).toEqual(["explanation"]);
  });

  it("lists the figure checks once a question names a figure", () => {
    const groups = groupChecks([
      makeQuestion({
        expected: { figure: "sum(area_ha)", figure_claim: "#1 < 0 :: a || b" },
      }),
    ]);
    const keys = groups.byStage.flatMap((s) => s.checks.map((c) => c.key));
    expect(keys).toContain("figure_match");
    expect(keys).toContain("figure_claim_match");
  });

  it("marks the AI reviewer's checks as judged", () => {
    expect(checkLabel("expected_text_match")).toBe(
      "Reply says what it must (judged)"
    );
    expect(checkLabel("aoi_id_match")).toBe("Picked the right place");
    expect(checkLabel("not_a_check")).toBe("not_a_check");
  });
});

describe("filterQuestions", () => {
  const pass = makeQuestion({ id: "a" });
  const flaky = makeQuestion({
    id: "b",
    status: "inconsistent",
    failedChecks: [
      {
        check: "aoi_id_match",
        stage: "retrieval",
        verdict: "pass",
        perTrial: [true, false, true],
        actual: null,
        reason: null,
      },
    ],
  });
  const failed = makeQuestion({
    id: "c",
    verdict: "fail",
    status: "fail",
    useCases: ["UC2"],
    type: "causal",
    query: "Why is Riau burning?",
  });
  const errored = makeQuestion({ id: "d", verdict: "error", status: "error" });
  const all = [pass, flaky, failed, errored];
  const ids = (f: Partial<typeof NO_FILTER>) =>
    filterQuestions(all, { ...NO_FILTER, ...f }).map((q) => q.id);

  it("filters by status, type, use case and searches the check labels", () => {
    expect(ids({ status: "failed" })).toEqual(["c", "d"]);
    expect(ids({ status: "inconsistent" })).toEqual(["b"]);
    expect(ids({ type: "causal" })).toEqual(["c"]);
    expect(ids({ useCase: "UC2" })).toEqual(["c"]);
    expect(ids({ search: "right place" })).toEqual(["b"]);
    expect(ids({ search: "RIAU" })).toEqual(["c"]);
  });
});

describe("mixSentence", () => {
  it("names the top types, the places over 15% and the top datasets, keeping acronyms", () => {
    expect(mixSentence(makeUseCase())).toBe(
      "Mostly monitoring and causal questions, about sub-national areas and protected areas, using GHG net flux and tree cover loss."
    );
  });
});

describe("runs", () => {
  const ref = (n: number) => String(n).repeat(40);

  it("names each release by its month (by its day when it shares one) and keeps its draft flag", () => {
    const runs = releasedRuns([
      { runId: "20261128T090000Z_prod", ref: ref(3), draft: true },
      { runId: "20261014T090000Z_prod", ref: ref(1), draft: false },
      { runId: "20261028T124051Z_prod", ref: ref(2), draft: false },
    ]);
    expect(runs.map((r) => [r.runId, r.label, r.draft])).toEqual([
      ["20261014T090000Z_prod", "14 October 2026", false],
      ["20261028T124051Z_prod", "28 October 2026", false],
      ["20261128T090000Z_prod", "November 2026", true],
    ]);
  });

  it("refuses a bad run id, a short ref or a run released twice", () => {
    const ok = { runId: "20261028T124051Z_prod", ref: ref(2), draft: false };
    expect(() => releasedRuns([{ ...ok, runId: "latest" }])).toThrow(
      /not a run id/
    );
    expect(() => releasedRuns([{ ...ok, ref: "f7c138e" }])).toThrow(
      /not a commit sha/
    );
    expect(() => releasedRuns([ok, ok])).toThrow(/listed twice/);
  });

  it("accepts the releases the page ships", () => {
    expect(releasedRuns(RELEASES)).toHaveLength(RELEASES.length);
  });

  it("opens on the requested release, else the newest", () => {
    const runs = releasedRuns([
      { runId: "20261014T090000Z_prod", ref: ref(1), draft: false },
      { runId: "20261028T124051Z_prod", ref: ref(2), draft: false },
    ]);
    expect(pickRun(runs, "20261014T090000Z_prod").runId).toBe(
      "20261014T090000Z_prod"
    );
    expect(pickRun(runs, "missing").runId).toBe("20261028T124051Z_prod");
    expect(pickRun(runs, null).runId).toBe("20261028T124051Z_prod");
  });

  it("draws the trend from loaded pages of one version only", () => {
    const page = (runId: string, version: string, draft: boolean) =>
      ({
        run: { runId, started: "2026-10-28T00:00:00Z", draft },
        benchmark: { version },
        summary: makeStats({ everyTime: 0.6, majority: 0.7, anyTime: 0.8 }),
      }) as unknown as BenchmarkPage;
    expect(
      trendPoints(
        [
          page("a", "2026", false),
          undefined,
          page("b", "2027", false),
          page("c", "2026", true),
        ],
        "2026"
      ).map((p) => [p.runId, p.draft])
    ).toEqual([
      ["a", false],
      ["c", true],
    ]);
  });

  it("places dates on the axis in months since September 2026", () => {
    expect(monthsSinceOrigin("2026-09-01T00:00:00Z")).toBe(0);
    expect(monthsSinceOrigin("2026-11-16T00:00:00Z")).toBeCloseTo(2.5);
  });
});

describe("format", () => {
  it("formats shares and days", () => {
    expect(pct(0.5018587, 1)).toBe("50.2%");
    expect(pct(null)).toBe("–");
    expect(share(1, 0)).toBeNull();
    expect(formatDay("2026-10-23T09:44:47Z")).toBe("23 Oct 2026");
    expect(formatMonth("2026-10-28T12:40:51Z")).toBe("Oct 2026");
  });

  it("names the Benchmark Set a version belongs to", () => {
    expect(versionSet("2026-draft-3")).toBe("2026");
    expect(versionSet("2026-draft")).toBe("2026");
    expect(versionSet("2026")).toBe("2026");
  });
});
