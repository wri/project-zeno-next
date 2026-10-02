import { describe, it, expect } from "vitest";

import { byRecentlyUpdated, paginate } from "../pagination";

const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

describe("paginate", () => {
  it("reports a single valid page for an empty list", () => {
    expect(paginate([], 1, 8)).toEqual({ items: [], page: 1, totalPages: 1 });
  });

  it("returns the whole list when it fits on one page", () => {
    expect(paginate(items.slice(0, 8), 1, 8)).toEqual({
      items: ["a", "b", "c", "d", "e", "f", "g", "h"],
      page: 1,
      totalPages: 1,
    });
  });

  it("splits into pages of pageSize, last page partial", () => {
    expect(paginate(items, 1, 8).items).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
    ]);
    expect(paginate(items, 2, 8)).toEqual({
      items: ["i", "j"],
      page: 2,
      totalPages: 2,
    });
  });

  it("counts a page per exact multiple, with no trailing empty page", () => {
    expect(paginate(items.slice(0, 8), 1, 4).totalPages).toBe(2);
    expect(paginate(items, 1, 5).totalPages).toBe(2);
  });

  it("clamps a page past the end back to the last page", () => {
    // Held state says page 3, but two deletions left only one page of items.
    expect(paginate(items.slice(0, 6), 3, 8)).toEqual({
      items: ["a", "b", "c", "d", "e", "f"],
      page: 1,
      totalPages: 1,
    });
  });

  it("clamps a page below the start back to page 1", () => {
    expect(paginate(items, 0, 8).page).toBe(1);
    expect(paginate(items, -4, 8).page).toBe(1);
  });

  it("does not mutate the input", () => {
    const input = [...items];
    paginate(input, 2, 4);
    expect(input).toEqual(items);
  });
});

describe("byRecentlyUpdated", () => {
  const sort = (dates: string[]) =>
    [...dates].map((updated_at) => ({ updated_at })).sort(byRecentlyUpdated);

  it("orders most recently updated first", () => {
    expect(
      sort([
        "2026-01-01T00:00:00Z",
        "2026-03-01T00:00:00Z",
        "2026-02-01T00:00:00Z",
      ])
    ).toEqual([
      { updated_at: "2026-03-01T00:00:00Z" },
      { updated_at: "2026-02-01T00:00:00Z" },
      { updated_at: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("sorts unparseable dates last rather than onto page 1", () => {
    expect(sort(["not-a-date", "2026-01-01T00:00:00Z"])).toEqual([
      { updated_at: "2026-01-01T00:00:00Z" },
      { updated_at: "not-a-date" },
    ]);
  });

  it("treats two unparseable dates as equal", () => {
    expect(
      byRecentlyUpdated({ updated_at: "nope" }, { updated_at: "also nope" })
    ).toBe(0);
  });
});
