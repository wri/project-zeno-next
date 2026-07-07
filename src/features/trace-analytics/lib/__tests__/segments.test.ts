import { describe, expect, it } from "vitest";
import {
  buildDailyUserSegments,
  buildFirstSeenLookup,
  classifyUserSegments,
  computeEngagedUsers,
} from "../analytics/segments";
import { makeRow } from "./helpers";

describe("computeEngagedUsers", () => {
  it("requires ≥2 sessions each with ≥2 prompts", () => {
    const rows = [
      // u1: two sessions with two prompts each → engaged
      makeRow({ traceId: "a", userId: "u1", sessionId: "s1" }),
      makeRow({ traceId: "b", userId: "u1", sessionId: "s1" }),
      makeRow({ traceId: "c", userId: "u1", sessionId: "s2" }),
      makeRow({ traceId: "d", userId: "u1", sessionId: "s2" }),
      // u2: one session with 4 prompts → not engaged
      makeRow({ traceId: "e", userId: "u2", sessionId: "s3" }),
      makeRow({ traceId: "f", userId: "u2", sessionId: "s3" }),
      makeRow({ traceId: "g", userId: "u2", sessionId: "s3" }),
      makeRow({ traceId: "h", userId: "u2", sessionId: "s3" }),
      // u3: two sessions with 1 prompt each → not engaged
      makeRow({ traceId: "i", userId: "u3", sessionId: "s4" }),
      makeRow({ traceId: "j", userId: "u3", sessionId: "s5" }),
    ];
    const engaged = computeEngagedUsers(rows);
    expect(engaged).toEqual(new Set(["u1"]));
  });

  it("ignores rows with blank user or session ids", () => {
    const rows = [
      makeRow({ traceId: "a", userId: " ", sessionId: "s1" }),
      makeRow({ traceId: "b", userId: "u1", sessionId: "" }),
    ];
    expect(computeEngagedUsers(rows).size).toBe(0);
  });
});

describe("buildFirstSeenLookup", () => {
  it("prefers the authoritative map and back-fills from the window", () => {
    const rows = [
      makeRow({ traceId: "a", userId: "u1", date: "2026-06-02" }),
      makeRow({ traceId: "b", userId: "u2", date: "2026-06-03" }),
      makeRow({ traceId: "c", userId: "u2", date: "2026-06-01" }),
    ];
    const authoritative = new Map([["u1", "2026-01-15"]]);
    const { firstSeenByUser, filledFromWindow } = buildFirstSeenLookup(
      rows,
      authoritative
    );
    expect(firstSeenByUser.get("u1")).toBe("2026-01-15");
    // u2 back-filled with the earliest window date
    expect(firstSeenByUser.get("u2")).toBe("2026-06-01");
    expect(filledFromWindow).toBe(1);
  });
});

describe("classifyUserSegments", () => {
  it("splits new vs returning around the window start", () => {
    const rows = [
      makeRow({ traceId: "a", userId: "newbie", date: "2026-06-02" }),
      makeRow({ traceId: "b", userId: "veteran", date: "2026-06-02" }),
    ];
    const authoritative = new Map([
      ["newbie", "2026-06-02"],
      ["veteran", "2026-01-01"],
    ]);
    const segments = classifyUserSegments(
      rows,
      authoritative,
      "2026-06-01",
      "2026-06-07"
    );
    expect(segments.newUsers).toEqual(new Set(["newbie"]));
    expect(segments.returningUsers).toEqual(new Set(["veteran"]));
    expect(segments.notEngagedUsers).toEqual(new Set(["newbie", "veteran"]));
  });
});

describe("buildDailyUserSegments", () => {
  it("counts a user as new only on their first-seen day", () => {
    const rows = [
      makeRow({ traceId: "a", userId: "u1", date: "2026-06-01" }),
      makeRow({ traceId: "b", userId: "u1", date: "2026-06-02" }),
    ];
    const firstSeen = new Map([["u1", "2026-06-01"]]);
    const daily = buildDailyUserSegments(rows, firstSeen, new Set());
    expect(daily).toEqual([
      {
        date: "2026-06-01",
        newUsers: 1,
        returningUsers: 0,
        engagedUsers: 0,
        notEngagedUsers: 1,
      },
      {
        date: "2026-06-02",
        newUsers: 0,
        returningUsers: 1,
        engagedUsers: 0,
        notEngagedUsers: 1,
      },
    ]);
  });
});
