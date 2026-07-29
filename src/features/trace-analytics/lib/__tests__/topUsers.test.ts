import { describe, expect, it } from "vitest";
import { computeUserActivity } from "../analytics/topUsers";
import { makeRow } from "./helpers";

describe("computeUserActivity", () => {
  it("aggregates prompts, sessions, days and success per user", () => {
    const rows = [
      makeRow({
        traceId: "a",
        userId: "u1",
        sessionId: "s1",
        date: "2026-06-01",
        outcome: "ANSWER",
      }),
      makeRow({
        traceId: "b",
        userId: "u1",
        sessionId: "s1",
        date: "2026-06-01",
        outcome: "ERROR",
      }),
      makeRow({
        traceId: "c",
        userId: "u1",
        sessionId: "s2",
        date: "2026-06-02",
        outcome: "ANSWER",
      }),
      makeRow({
        traceId: "d",
        userId: "u1",
        sessionId: "s2",
        date: "2026-06-02",
        outcome: "ANSWER",
      }),
      makeRow({
        traceId: "e",
        userId: "u2",
        sessionId: "s3",
        date: "2026-06-01",
        outcome: "ANSWER",
      }),
    ];
    const activity = computeUserActivity(rows);

    expect(activity[0].userId).toBe("u1"); // sorted by prompts desc
    expect(activity[0]).toMatchObject({
      prompts: 4,
      sessions: 2,
      activeDays: 2,
      firstActive: "2026-06-01",
      lastActive: "2026-06-02",
      engaged: true, // two sessions with ≥2 prompts each
    });
    expect(activity[0].successRate).toBeCloseTo(0.75);

    expect(activity[1]).toMatchObject({
      userId: "u2",
      prompts: 1,
      engaged: false,
    });
  });

  it("skips rows without a user id", () => {
    const rows = [makeRow({ traceId: "a", userId: "  " })];
    expect(computeUserActivity(rows)).toEqual([]);
  });
});
