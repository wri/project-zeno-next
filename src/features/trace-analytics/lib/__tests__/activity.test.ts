import { describe, expect, it } from "vitest";
import { computeHourlyActivity } from "../analytics/activity";
import { computeSessionDepth } from "../analytics/sessions";
import { makeRow } from "./helpers";

describe("computeHourlyActivity", () => {
  it("buckets traces into a Monday-start weekday × UTC hour grid", () => {
    const rows = [
      // 2026-06-01 is a Monday.
      makeRow({ timestamp: "2026-06-01T10:15:00.000Z" }),
      makeRow({ timestamp: "2026-06-01T10:45:00.000Z" }),
      // 2026-06-07 is a Sunday.
      makeRow({ timestamp: "2026-06-07T23:00:00.000Z" }),
    ];
    const activity = computeHourlyActivity(rows);

    expect(activity.total).toBe(3);
    expect(activity.maxCount).toBe(2);
    expect(activity.cells).toHaveLength(7 * 24);
    const monday10 = activity.cells.find(
      (c) => c.weekday === 0 && c.hour === 10
    );
    const sunday23 = activity.cells.find(
      (c) => c.weekday === 6 && c.hour === 23
    );
    expect(monday10?.count).toBe(2);
    expect(sunday23?.count).toBe(1);
  });

  it("skips rows without a parseable timestamp", () => {
    const activity = computeHourlyActivity([makeRow({ timestamp: null })]);
    expect(activity.total).toBe(0);
    expect(activity.maxCount).toBe(0);
  });
});

describe("computeSessionDepth", () => {
  it("counts prompts per session and the single-turn share", () => {
    const rows = [
      makeRow({ sessionId: "a" }),
      makeRow({ sessionId: "a" }),
      makeRow({ sessionId: "a" }),
      makeRow({ sessionId: "b" }),
      makeRow({ sessionId: null }), // no session → excluded
    ];
    const depth = computeSessionDepth(rows);

    expect(depth.sessionCount).toBe(2);
    expect([...depth.turnsPerSession].sort()).toEqual([1, 3]);
    expect(depth.singleTurnShare).toBe(0.5);
    expect(depth.meanTurns).toBe(2);
    expect(depth.maxTurns).toBe(3);
  });

  it("returns zeros for empty input", () => {
    const depth = computeSessionDepth([]);
    expect(depth.sessionCount).toBe(0);
    expect(depth.singleTurnShare).toBe(0);
  });
});
