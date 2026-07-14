import { describe, expect, it } from "vitest";
import { tagTraces } from "../analytics/taxonomy";
import {
  cellExcessFailures,
  cellFailures,
  cellSuccessRate,
  computeIntentTopicMatrix,
  MIN_RESOLVED,
  tracesForIntentTopic,
} from "../analytics/intentTopicMatrix";
import { makeRow } from "./helpers";

// Each row gets its own session so every turn is an independent opening
// new_query and the taxonomy assigns intent/topics from the prompt alone.
let seq = 0;
function row(prompt: string, outcome: string | null = "ANSWER") {
  seq += 1;
  return makeRow({
    traceId: `t${seq}`,
    sessionId: `s${seq}`,
    prompt,
    outcome,
  });
}

/**
 * Known classifications (pinned by taxonomy.test.ts):
 * - "How much tree cover loss in Brazil?"  → quantification × Forest & tree cover
 * - "recent fire alerts"                   → monitoring × Fire + Alerts & disturbance
 * - "How much area was affected in 2023?"  → quantification × Unclassified
 * - "yes"                                  → not_applicable (excluded)
 */
const QUANT_FOREST = "How much tree cover loss in Brazil?";
const MONITOR_FIRE_ALERTS = "recent fire alerts";
const QUANT_UNCLASSIFIED = "How much area was affected in 2023?";

const SUCCESS = new Set(["ANSWER"]);

describe("computeIntentTopicMatrix", () => {
  it("crosses substantive intents with coarse topics and skips non-substantive turns", () => {
    const tagged = tagTraces([
      row(QUANT_FOREST),
      row(QUANT_FOREST),
      row(MONITOR_FIRE_ALERTS),
      row("yes"),
    ]);
    const matrix = computeIntentTopicMatrix(tagged, { successKeys: SUCCESS });

    expect(matrix.intents).toEqual(["quantification", "monitoring"]);
    expect(matrix.topics).toEqual([
      "Forest & tree cover",
      "Alerts & disturbance",
      "Fire",
    ]);

    const cell = (intent: string, topic: string) =>
      matrix.cells[matrix.intents.indexOf(intent)][
        matrix.topics.indexOf(topic)
      ];
    expect(cell("quantification", "Forest & tree cover").count).toBe(2);
    // multi-tag: the fire-alerts turn counts under BOTH of its coarse topics
    expect(cell("monitoring", "Fire").count).toBe(1);
    expect(cell("monitoring", "Alerts & disturbance").count).toBe(1);
    expect(cell("monitoring", "Forest & tree cover").count).toBe(0);

    expect(matrix.total).toBe(4); // 2 + 1 + 1 pair occurrences
    expect(matrix.maxCount).toBe(2);
  });

  it("pins Unclassified last regardless of its volume", () => {
    const tagged = tagTraces([
      row(QUANT_UNCLASSIFIED),
      row(QUANT_UNCLASSIFIED),
      row(QUANT_UNCLASSIFIED),
      row(QUANT_FOREST),
    ]);
    const matrix = computeIntentTopicMatrix(tagged, { successKeys: SUCCESS });
    expect(matrix.topics).toEqual(["Forest & tree cover", "Unclassified"]);
  });

  it("counts resolved and successful outcomes per cell", () => {
    const tagged = tagTraces([
      row(QUANT_FOREST, "ANSWER"),
      row(QUANT_FOREST, "SOFT_ERROR"),
      row(QUANT_FOREST, null), // unresolved: in count, not in resolved
    ]);
    const matrix = computeIntentTopicMatrix(tagged, { successKeys: SUCCESS });
    const cell = matrix.cells[0][0];
    expect(cell.count).toBe(3);
    expect(cell.resolved).toBe(2);
    expect(cell.successes).toBe(1);
    expect(matrix.avgSuccessRate).toBe(0.5);
  });

  it("resolves outcomes through a custom accessor (refined view)", () => {
    const rows = [row(QUANT_FOREST, "ANSWER"), row(QUANT_FOREST, "ANSWER")];
    const tagged = tagTraces(rows);
    const refined = new Map([
      [rows[0].traceId, "ANSWER_CLEAN"],
      [rows[1].traceId, "SOFT_ERROR"],
    ]);
    const matrix = computeIntentTopicMatrix(tagged, {
      outcomeOf: (t) => refined.get(t.row.traceId),
      successKeys: new Set(["ANSWER_CLEAN"]),
    });
    const cell = matrix.cells[0][0];
    expect(cell.resolved).toBe(2);
    expect(cell.successes).toBe(1);
  });

  it("returns an empty matrix with a null average when nothing is substantive", () => {
    const matrix = computeIntentTopicMatrix(tagTraces([row("yes")]), {
      successKeys: SUCCESS,
    });
    expect(matrix.intents).toEqual([]);
    expect(matrix.topics).toEqual([]);
    expect(matrix.total).toBe(0);
    expect(matrix.avgSuccessRate).toBeNull();
  });
});

describe("cell metrics", () => {
  const cell = { count: 40, resolved: 40, successes: 24 }; // 60% success

  it("suppresses the success rate below the resolved floor", () => {
    expect(cellSuccessRate({ count: 10, resolved: 10, successes: 9 })).toBe(
      null
    );
    expect(
      cellSuccessRate({
        count: MIN_RESOLVED,
        resolved: MIN_RESOLVED,
        successes: MIN_RESOLVED,
      })
    ).toBe(1);
    expect(cellSuccessRate(cell)).toBeCloseTo(0.6);
  });

  it("computes absolute failures", () => {
    expect(cellFailures(cell)).toBe(16);
    expect(cellFailures({ count: 5, resolved: 0, successes: 0 })).toBe(0);
  });

  it("computes failures in excess of the grid-average rate", () => {
    // At a 70% average, 40 resolved turns "should" fail 12 times; 16 actual.
    expect(cellExcessFailures(cell, 0.7)).toBeCloseTo(4);
    // At or below the cell's own rate, there is no excess.
    expect(cellExcessFailures(cell, 0.6)).toBe(0);
    expect(cellExcessFailures(cell, 0.4)).toBe(0);
    expect(cellExcessFailures(cell, null)).toBe(0);
  });
});

describe("tracesForIntentTopic", () => {
  it("returns exactly the turns the cell counted", () => {
    const tagged = tagTraces([
      row(QUANT_FOREST),
      row(MONITOR_FIRE_ALERTS),
      row("yes"),
    ]);
    const forest = tracesForIntentTopic(
      tagged,
      "quantification",
      "Forest & tree cover"
    );
    expect(forest.map((t) => t.row.prompt)).toEqual([QUANT_FOREST]);

    // the multi-topic turn is reachable through either of its topics
    expect(tracesForIntentTopic(tagged, "monitoring", "Fire")).toHaveLength(1);
    expect(
      tracesForIntentTopic(tagged, "monitoring", "Alerts & disturbance")
    ).toHaveLength(1);
    expect(tracesForIntentTopic(tagged, "monitoring", "Urban")).toHaveLength(0);
  });
});
