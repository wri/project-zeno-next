import { describe, expect, it } from "vitest";
import { computeOutcomeMixByDataset } from "../analytics/datasetOutcomes";
import { makeRow } from "./helpers";

describe("computeOutcomeMixByDataset", () => {
  it("splits traces per dataset by outcome, exploding CSV lists", () => {
    const rows = [
      makeRow({ datasetsAnalysed: "Tree cover loss", outcome: "ANSWER" }),
      makeRow({ datasetsAnalysed: "Tree cover loss", outcome: "ERROR" }),
      makeRow({
        datasetsAnalysed: "Tree cover loss, DIST alerts",
        outcome: "ANSWER",
      }),
      makeRow({ datasetsAnalysed: "", outcome: "ANSWER" }), // no dataset → dropped
    ];
    const mix = computeOutcomeMixByDataset(rows);

    expect(mix).toHaveLength(2);
    expect(mix[0].label).toBe("Tree cover loss");
    expect(mix[0].total).toBe(3);
    expect(mix[0].counts).toEqual({ ANSWER: 2, ERROR: 1 });
    expect(mix[1]).toEqual({
      label: "DIST alerts",
      total: 1,
      counts: { ANSWER: 1 },
    });
  });

  it("caps the list at topN datasets by volume", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      makeRow({ datasetsAnalysed: `ds-${i}`, outcome: "ANSWER" })
    );
    expect(computeOutcomeMixByDataset(rows, 5)).toHaveLength(5);
  });

  it("ignores rows without an outcome", () => {
    const rows = [makeRow({ datasetsAnalysed: "x", outcome: null })];
    expect(computeOutcomeMixByDataset(rows)).toEqual([]);
  });
});
