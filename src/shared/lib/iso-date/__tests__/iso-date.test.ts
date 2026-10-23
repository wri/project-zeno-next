import { describe, expect, it } from "vitest";

import { shiftIsoDate, todayIso } from "../iso-date";

describe("shiftIsoDate", () => {
  it("shifts across month, year and leap-day boundaries without a timezone", () => {
    expect(shiftIsoDate("2026-10-16", -2)).toBe("2026-10-14");
    expect(shiftIsoDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftIsoDate("2027-01-01", -1)).toBe("2026-12-31");
    expect(shiftIsoDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftIsoDate("2026-10-16", 0)).toBe("2026-10-16");
    expect(shiftIsoDate("2026-10-16", 29)).toBe("2026-11-14");
  });
});

describe("todayIso", () => {
  it("reads today in UTC", () => {
    expect(todayIso(Date.UTC(2026, 9, 16, 23, 30))).toBe("2026-10-16");
    expect(todayIso(Date.UTC(2026, 9, 16, 0, 5))).toBe("2026-10-16");
  });

  it("defaults to now", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
