import { describe, expect, it } from "vitest";
import { accuracyBreakdown, primaryDimension } from "../attribution";
import { trialSpreadPts } from "../stats";
import { isInfoOnly } from "../checks";
import {
  caseRow,
  challengeInfoRow,
  errorRow,
  goldTrialRow,
  multiturnRow,
  passingChallengeRow,
  uncoveredRow,
} from "./fixtures";

describe("primaryDimension", () => {
  it("attributes to the earliest failing dedicated check, scope first", () => {
    // goldTrialRow fails scope_match AND three retrieval checks -> scope wins
    expect(primaryDimension(goldTrialRow)).toBe("scope");
    // challengeInfoRow fails dataset_id_match + pull_source_match (retrieval)
    expect(primaryDimension(challengeInfoRow)).toBe("retrieval");
  });

  it("orders retrieval above analysis/explanation/output", () => {
    const row = caseRow({
      uid: "u",
      id: "x",
      checks: { chart_well_formed: 0, expected_text_match: 0, aoi_id_match: 0 },
    });
    expect(primaryDimension(row)).toBe("retrieval");
  });

  it("strips multi-turn prefixes before attributing", () => {
    const row = caseRow({
      uid: "u",
      id: "mt",
      checks: { "t2.chart_integrity": 0, "t1.expected_text_match": 0 },
    });
    expect(primaryDimension(row)).toBe("analysis");
  });

  it("sends shared-only failures to the unattributed class", () => {
    const row = caseRow({
      uid: "u",
      id: "s",
      checks: { agent_answer: 0, aoi_id_match: 1 },
    });
    expect(primaryDimension(row)).toBe("unattributed");
  });

  it("ignores info-only failures and returns null for non-fails", () => {
    expect(primaryDimension(passingChallengeRow)).toBeNull();
    expect(
      primaryDimension(
        caseRow({ uid: "u", id: "i", checks: { answer_traceability: 0 } })
      )
    ).toBeNull();
  });
});

describe("accuracyBreakdown", () => {
  it("splits rows into pass, dimensions and exclusions", () => {
    const breakdown = accuracyBreakdown([
      goldTrialRow, // fail -> scope
      challengeInfoRow, // fail -> retrieval
      multiturnRow, // pass
      passingChallengeRow, // pass
      errorRow, // error (excluded from the flow)
      uncoveredRow, // uncovered (excluded)
    ]);
    expect(breakdown.total).toBe(6);
    expect(breakdown.pass).toBe(2);
    expect(breakdown.byDimension.scope).toBe(1);
    expect(breakdown.byDimension.retrieval).toBe(1);
    expect(breakdown.byDimension.unattributed).toBe(0);
    expect(breakdown.error).toBe(1);
    expect(breakdown.uncovered).toBe(1);
  });
});

describe("trialSpreadPts", () => {
  it("is null on 1-trial runs and empty inputs", () => {
    expect(trialSpreadPts([passingChallengeRow], 1, isInfoOnly)).toBeNull();
    expect(trialSpreadPts([], 3, isInfoOnly)).toBeNull();
  });

  it("is 0 when every trial scores identically", () => {
    // multiturnRow: three identical clean trials -> rates [1, 1, 1]
    expect(trialSpreadPts([multiturnRow], 3, isInfoOnly)).toBe(0);
  });

  it("measures the spread when trials disagree", () => {
    const flappy = caseRow({
      uid: "u",
      id: "f",
      checks: { aoi_id_match: 1 },
      trials: [
        { checks: { aoi_id_match: 1 }, latencyS: 1 },
        { checks: { aoi_id_match: 1 }, latencyS: 1 },
        { checks: { aoi_id_match: 0 }, latencyS: 1 },
      ],
    });
    // rates over 2 rows: [1, 1, 0.5] -> sample std ≈ 0.2887 -> 28.9 pts
    const spread = trialSpreadPts([flappy, multiturnRow], 3, isInfoOnly);
    expect(spread).toBeCloseTo(28.8675, 3);
  });

  it("treats a missing trial as uncovered, never a pass", () => {
    const oneTrialRow = caseRow({
      uid: "u",
      id: "o",
      checks: { aoi_id_match: 1 },
      trials: [{ checks: { aoi_id_match: 1 }, latencyS: 1 }],
    });
    // trial 2 and 3 missing -> rates [1, 0, 0]
    const spread = trialSpreadPts([oneTrialRow], 3, isInfoOnly);
    expect(spread).toBeCloseTo(57.735, 3);
  });
});
