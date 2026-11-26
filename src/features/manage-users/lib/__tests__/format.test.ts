import { describe, expect, it } from "vitest";
import { formatDay, formatLoadedAt, usersLabel } from "../format";

describe("usersLabel", () => {
  it.each([
    [0, "0 users"],
    [1, "1 user"],
    [312, "312 users"],
    [1400, "1,400 users"],
  ])("%d is %s", (n, expected) => {
    expect(usersLabel(n)).toBe(expected);
  });
});

describe("formatDay", () => {
  it.each([
    ["2026-11-05", "Nov 5, 2026"],
    ["2026-01-31", "Jan 31, 2026"],
  ])("%s is %s", (day, expected) => {
    expect(formatDay(day)).toBe(expected);
  });
});

describe("formatLoadedAt", () => {
  // Local times, so the cases hold in any time zone.
  const now = new Date(2026, 10, 23, 16, 5).getTime();

  it.each([
    ["earlier today", new Date(2026, 10, 23, 14, 41), "2:41 PM"],
    ["just after midnight", new Date(2026, 10, 23, 0, 3), "12:03 AM"],
    ["yesterday", new Date(2026, 10, 22, 14, 41), "Nov 22, 2:41 PM"],
  ])("%s", (_, loadedAt, expected) => {
    expect(formatLoadedAt(loadedAt.getTime(), now)).toBe(expected);
  });
});
