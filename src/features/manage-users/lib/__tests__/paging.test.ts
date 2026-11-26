import { describe, expect, it } from "vitest";
import { pageOf, type PageSize } from "../paging";

const rows = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("pageOf", () => {
  it.each<[string, number, number, PageSize, object]>([
    [
      "the first page",
      312,
      1,
      100,
      { page: 1, lastPage: 4, first: 1, last: 100 },
    ],
    [
      "a middle page",
      312,
      2,
      100,
      { page: 2, lastPage: 4, first: 101, last: 200 },
    ],
    [
      "a short last page",
      312,
      4,
      100,
      { page: 4, lastPage: 4, first: 301, last: 312 },
    ],
    [
      "an exact fit",
      200,
      2,
      100,
      { page: 2, lastPage: 2, first: 101, last: 200 },
    ],
    [
      "a page past the end",
      120,
      3,
      50,
      { page: 3, lastPage: 3, first: 101, last: 120 },
    ],
    [
      "a list that shrank",
      30,
      5,
      50,
      { page: 1, lastPage: 1, first: 1, last: 30 },
    ],
    ["no rows", 0, 1, 200, { page: 1, lastPage: 1, first: 1, last: 0 }],
  ])("%s", (_, count, page, size, expected) => {
    expect(pageOf(rows(count), page, size)).toMatchObject(expected);
  });

  it("returns the rows on the page", () => {
    expect(pageOf(rows(120), 3, 50).rows).toEqual(rows(120).slice(100));
  });
});
