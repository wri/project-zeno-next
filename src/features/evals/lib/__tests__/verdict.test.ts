import { describe, expect, it } from "vitest";
import { baseCheckName, bucketsFor, isInfoOnly } from "../checks";
import { rowVerdict, strictClean } from "../verdict";
import {
  caseRow,
  challengeInfoRow,
  errorRow,
  goldTrialRow,
  multiturnRow,
  passingChallengeRow,
  uncoveredRow,
} from "./fixtures";

describe("check name helpers", () => {
  it("strips the multi-turn prefix", () => {
    expect(baseCheckName("t2.aoi_id_match")).toBe("aoi_id_match");
    expect(baseCheckName("aoi_id_match")).toBe("aoi_id_match");
    expect(baseCheckName("t12.state_delta")).toBe("state_delta");
  });

  it("recognises info-only checks through the prefix", () => {
    expect(isInfoOnly("answer_traceability")).toBe(true);
    expect(isInfoOnly("t2.answer_traceability")).toBe(true);
    expect(isInfoOnly("aoi_id_match")).toBe(false);
  });

  it("maps checks to buckets, prefix included", () => {
    expect(bucketsFor("t2.state_delta")).toEqual(["retrieval"]);
    expect(bucketsFor("agent_answer")).toEqual(["analysis", "explanation"]);
    expect(bucketsFor("date_coverage")).toEqual([]);
  });
});

describe("rowVerdict", () => {
  it("fails on any failing gating check", () => {
    expect(rowVerdict(goldTrialRow)).toBe("fail");
    expect(rowVerdict(challengeInfoRow)).toBe("fail");
  });

  it("passes a clean multi-turn row", () => {
    expect(rowVerdict(multiturnRow)).toBe("pass");
    expect(rowVerdict(passingChallengeRow)).toBe("pass");
  });

  it("treats an errored row as error, not failure", () => {
    expect(rowVerdict(errorRow)).toBe("error");
    expect(
      rowVerdict(caseRow({ uid: "u", id: "j", checks: {}, judgeErrors: ["x"] }))
    ).toBe("error");
  });

  it("marks a row with only info-only evaluations uncovered, never pass", () => {
    expect(rowVerdict(uncoveredRow)).toBe("uncovered");
    // an info-only FAILURE alone still leaves the row uncovered
    expect(
      rowVerdict(
        caseRow({ uid: "u", id: "i", checks: { answer_traceability: 0 } })
      )
    ).toBe("uncovered");
  });
});

describe("strictClean", () => {
  it("is false for any non-pass verdict", () => {
    expect(strictClean(goldTrialRow)).toBe(false);
    expect(strictClean(errorRow)).toBe(false);
  });

  it("is true when every trial is clean", () => {
    expect(strictClean(multiturnRow)).toBe(true);
  });

  it("falls back to the majority verdict without per-trial data", () => {
    expect(strictClean(passingChallengeRow)).toBe(true);
  });

  it("fails a majority pass whose trials flapped on a gating check", () => {
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
    expect(rowVerdict(flappy)).toBe("pass");
    expect(strictClean(flappy)).toBe(false);
  });

  it("ignores info-only flaps in trials", () => {
    const infoFlap = caseRow({
      uid: "u",
      id: "i",
      checks: { aoi_id_match: 1 },
      trials: [
        { checks: { aoi_id_match: 1, answer_traceability: 0 }, latencyS: 1 },
      ],
    });
    expect(strictClean(infoFlap)).toBe(true);
  });
});
