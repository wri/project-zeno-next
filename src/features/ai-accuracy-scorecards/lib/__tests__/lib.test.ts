import { describe, expect, it } from "vitest";
import { checkLabel } from "../../model/checks";
import { groupChecks } from "../checks";
import { failureBreakdown, failureFlow, failurePhrase } from "../failures";
import {
  formatDay,
  formatReleaseName,
  pct,
  share,
  versionSet,
} from "../format";
import { mixSentence } from "../mix";
import { filterQuestions, NO_FILTER } from "../questions";
import { monthsSinceOrigin, releasedRuns, trendPoints } from "../runs";
import { tierFigure, tierLines, tiersOf } from "../tiers";
import { RELEASES } from "../../model/releases";
import type { BenchmarkPage, FailedCheck } from "../../model/types";
import { makeQuestion, makeStats, makeUseCase } from "./fixtures";

describe("tiersOf", () => {
  it("lists the four tiers best first, with their share of the scored", () => {
    const tiers = tiersOf(
      makeStats({
        scored: 269,
        tiers: { every: 135, most: 35, some: 21, never: 78 },
      })
    );
    expect(tiers.map((t) => [t.key, t.count])).toEqual([
      ["every", 135],
      ["most", 35],
      ["some", 21],
      ["never", 78],
    ]);
    expect(tiers[0].share).toBeCloseTo(135 / 269);
  });

  it("treats a group with no scored question as empty", () => {
    const tiers = tiersOf(
      makeStats({
        scored: 0,
        tiers: { every: 0, most: 0, some: 0, never: 0 },
      })
    );
    expect(tiers.every((t) => t.count === 0 && t.share === null)).toBe(true);
  });

  it("words each tier once for labels and tooltips", () => {
    const stats = makeStats();
    expect(tierFigure(tiersOf(stats)[0])).toBe("40% (4)");
    expect(tierLines(stats)[0]).toBe("accurate every time 40% (4)");
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
      status: "fail",
      trialsRight: [false, false, false],
      primaryFailure: "unattributed",
      failedChecks: [failed("agent_answer", "shared", "fail")],
    }),
    makeQuestion({ id: "error", status: "error" }),
    makeQuestion({ id: "uncovered", status: "uncovered" }),
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
    status: "fail",
    useCases: ["UC2"],
    type: "causal",
    query: "Why is Riau burning?",
  });
  const errored = makeQuestion({ id: "d", status: "error" });
  // No check ran: neither scored nor a failure.
  const unchecked = makeQuestion({ id: "e", status: "uncovered" });
  const all = [pass, flaky, failed, errored, unchecked];
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
  it("lists the releases oldest first, whatever the list's order", () => {
    const runs = releasedRuns([...RELEASES].reverse());
    expect(runs.map((r) => r.runId)).toEqual(
      RELEASES.map((r) => r.runId).sort()
    );
    expect(runs.map((r) => r.name)).toEqual(
      [...RELEASES]
        .sort((a, b) => a.runId.localeCompare(b.runId))
        .map((r) => r.name)
    );
  });

  it("ships well-formed releases: names, run ids, full commit shas, each name and run once", () => {
    for (const release of RELEASES) {
      expect(release.name).toMatch(/^[a-z]{3}-\d{4}$/);
      expect(release.runId).toMatch(/^\d{8}T\d{6}Z_/);
      expect(release.ref).toMatch(/^[0-9a-f]{40}$/);
    }
    for (const key of ["name", "runId"] as const) {
      const values = RELEASES.map((r) => r[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("draws one trend point per loaded page, named by its release, whatever its version", () => {
    const runs = releasedRuns(RELEASES);
    const page = (runId: string, version: string, scored: number) =>
      ({
        run: { runId, started: "2026-10-28T00:00:00Z", draft: false },
        benchmark: { version },
        summary: makeStats({ scored, everyTime: 0.6 }),
      }) as unknown as BenchmarkPage;
    const pages = runs.map((r, i) => page(r.runId, `v${i}`, 260 + i));
    expect(trendPoints(runs, pages).map((p) => [p.name, p.runId])).toEqual(
      runs.map((r) => [r.name, r.runId])
    );
    expect(trendPoints(runs, pages).map((p) => p.scored)).toEqual(
      runs.map((_, i) => 260 + i)
    );
    // A page still loading leaves its own run out and keeps the rest named
    // by the right release.
    const rest = runs.slice(1);
    expect(
      trendPoints(runs, [undefined, ...pages.slice(1)]).map((p) => p.name)
    ).toEqual(rest.map((r) => r.name));
  });

  it("draws no point for a run that scored nothing", () => {
    const runs = releasedRuns(RELEASES);
    const empty = {
      run: {
        runId: runs[0].runId,
        started: "2026-10-28T00:00:00Z",
        draft: false,
      },
      summary: makeStats({
        scored: 0,
        everyTime: null,
        majority: null,
        anyTime: null,
      }),
    } as unknown as BenchmarkPage;
    expect(trendPoints(runs.slice(0, 1), [empty])).toEqual([]);
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
    expect(formatReleaseName("oct-2026")).toBe("October 2026");
  });

  it("names the Benchmark Set a version belongs to", () => {
    expect(versionSet("2026-draft-3")).toBe("2026");
    expect(versionSet("2026-draft")).toBe("2026");
    expect(versionSet("2026")).toBe("2026");
  });
});
