import { describe, expect, it } from "vitest";
import { buildWeeklyRetention, weekStartIso } from "../analytics/retention";
import { makeRow } from "./helpers";

describe("weekStartIso", () => {
  it("snaps any date to its Monday", () => {
    expect(weekStartIso("2026-06-01")).toBe("2026-06-01"); // a Monday
    expect(weekStartIso("2026-06-03")).toBe("2026-06-01"); // Wednesday
    expect(weekStartIso("2026-06-07")).toBe("2026-06-01"); // Sunday
    expect(weekStartIso("2026-06-08")).toBe("2026-06-08"); // next Monday
  });
});

describe("buildWeeklyRetention", () => {
  it("tracks cohort activity across weeks", () => {
    const rows = [
      // u1 first seen week of 06-01, active again the next week.
      makeRow({ traceId: "a", userId: "u1", date: "2026-06-02" }),
      makeRow({ traceId: "b", userId: "u1", date: "2026-06-09" }),
      // u2 first seen week of 06-01, never returns.
      makeRow({ traceId: "c", userId: "u2", date: "2026-06-03" }),
    ];
    const firstSeen = new Map([
      ["u1", "2026-06-02"],
      ["u2", "2026-06-03"],
    ]);
    const { cohorts, weeksInWindow } = buildWeeklyRetention(rows, firstSeen);

    expect(weeksInWindow).toBe(2);
    expect(cohorts).toHaveLength(1);
    const cohort = cohorts[0];
    expect(cohort.cohortWeek).toBe("2026-06-01");
    expect(cohort.size).toBe(2);
    expect(cohort.cells[0]).toMatchObject({
      offset: 0,
      activeUsers: 2,
      rate: 1,
    });
    expect(cohort.cells[1]).toMatchObject({
      offset: 1,
      activeUsers: 1,
      rate: 0.5,
    });
  });

  it("marks weeks outside the window as unobserved instead of zero", () => {
    const rows = [
      // Returning user whose cohort week (May) precedes the loaded window.
      makeRow({ traceId: "a", userId: "u1", date: "2026-06-10" }),
    ];
    const firstSeen = new Map([["u1", "2026-05-05"]]);
    const { cohorts } = buildWeeklyRetention(rows, firstSeen);
    const cohort = cohorts[0];
    expect(cohort.cohortWeek).toBe("2026-05-04");
    // Cohort week itself was not observed in the window.
    expect(cohort.cells[0].observed).toBe(false);
    // The active week is observed.
    const observed = cohort.cells.filter((c) => c.observed);
    expect(observed).toHaveLength(1);
    expect(observed[0].activeUsers).toBe(1);
  });

  it("returns an empty result for no rows", () => {
    expect(buildWeeklyRetention([], null)).toEqual({
      cohorts: [],
      maxOffset: 0,
      weeksInWindow: 0,
    });
  });
});
