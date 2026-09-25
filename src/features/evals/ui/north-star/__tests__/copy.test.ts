import { describe, expect, it } from "vitest";
import { QUERY_TYPES } from "../../../model/config";
import type { IntentCell } from "../../../lib/intent-matrix";
import type { Marker } from "../../../lib/annotations";
import {
  claimSentence,
  describeCell,
  markerNote,
  perfBand,
  scaleLine,
} from "../copy";

const quant = QUERY_TYPES.find((t) => t.key === "quantification")!;
const spatial = QUERY_TYPES.find((t) => t.key === "spatial")!;
const text = (segments: { text: string }[]) =>
  segments.map((s) => s.text).join("");

function cell(partial: Partial<IntentCell>): IntentCell {
  return {
    datasetId: "4",
    cases: 30,
    measured: 30,
    passed: 29,
    rate: 29 / 30,
    ciLow: 0.83,
    ciHigh: 0.99,
    coverage: "robust",
    missing: [],
    evaluated: [],
    ...partial,
  };
}

describe("claimSentence", () => {
  it("states the headline in plain language", () => {
    expect(claimSentence(0.811)).toBe(
      "When a user asks a question, the system responds with complete accuracy 81.1% of the time."
    );
  });
});

describe("scaleLine", () => {
  it("names the CHALLENGE set until a benchmark is frozen", () => {
    const line = scaleLine({
      source: { kind: "challenge" },
      questions: 491,
      datasets: 11,
      lastRun: "2026-09-01T20:49:46Z",
      trials: 1,
      casesetVersion: "291259f13da933e2",
    });
    expect(line.badge).toBe("CHALLENGE set");
    expect(line.detail).toContain("not yet frozen");
    expect(line.counts).toBe(
      "491 questions · 11 datasets · last run 1 Sep 2026"
    );
    expect(line.method).toBe("1 attempt each");
  });

  it("names the frozen benchmark version", () => {
    const line = scaleLine({
      source: {
        kind: "benchmark",
        version: "v2026",
        frozen: "2026-11-12",
        uids: new Set(),
        minTrials: 3,
      },
      questions: 512,
      datasets: 12,
      lastRun: "2027-09-09T00:00:00Z",
      trials: 3,
      casesetVersion: "x",
    });
    expect(line.badge).toBe("Benchmark v2026");
    expect(line.detail).toBe("frozen 12 Nov 2026 · re-versioned annually");
    expect(line.method).toBe("3 attempts each, majority verdict");
  });
});

describe("describeCell", () => {
  it("reads a measured cell as a plain-language claim", () => {
    const read = text(
      describeCell({
        intent: quant,
        datasetLabel: "Tree cover loss",
        cell: cell({}),
      })
    );
    expect(read).toBe(
      "When users ask direct questions quantifying Tree cover loss, the answer is completely accurate 97% of the time: a user here is rarely misled."
    );
  });

  it("flags priority cells", () => {
    const read = text(
      describeCell({
        intent: quant,
        datasetLabel: "Land cover",
        cell: cell({ passed: 6, measured: 12, rate: 0.5 }),
      })
    );
    expect(read).toContain("misled too often, and this cell is a priority");
  });

  it("claims nothing for a cell with no evals", () => {
    const read = text(
      describeCell({
        intent: quant,
        datasetLabel: "LGMS",
        cell: cell({
          cases: 0,
          measured: 0,
          passed: 0,
          rate: null,
          coverage: "none",
        }),
      })
    );
    expect(read).toContain("we don't know yet");
    expect(read).not.toMatch(/\d+%/);
  });

  it("separates authored-but-unrun cells", () => {
    const read = text(
      describeCell({
        intent: quant,
        datasetLabel: "Grasslands",
        cell: cell({
          cases: 12,
          measured: 0,
          passed: 0,
          rate: null,
          coverage: "thin",
        }),
      })
    );
    expect(read).toContain("12 evals exist");
  });

  it("phrases cross-cutting cells without a dataset", () => {
    const read = text(
      describeCell({
        intent: spatial,
        datasetLabel: null,
        cell: cell({ datasetId: null, passed: 68, measured: 100, rate: 0.68 }),
      })
    );
    expect(read).toContain("place-finding requests, whatever the dataset,");
    expect(read).toContain("68%");
  });
});

describe("perfBand", () => {
  it("maps rates onto the five-step ramp", () => {
    expect([0.33, 0.61, 0.72, 0.85, 0.97].map(perfBand)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});

describe("markerNote", () => {
  const base: Marker = {
    runId: "r",
    started: "2026-09-01T00:00:00Z",
    kinds: [],
  };

  it("explains a dip with its size", () => {
    const note = markerNote(
      { ...base, kinds: ["dip"], delta: -0.021 },
      { build: "b", casesetVersion: "v" }
    );
    expect(note.tone).toBe("dip");
    expect(note.body).toContain("Dipped 2.1 points");
  });

  it("describes the baseline", () => {
    const note = markerNote(
      { ...base, kinds: ["baseline"] },
      { build: "b", casesetVersion: "v" }
    );
    expect(note.title).toBe("Baseline");
  });
});
