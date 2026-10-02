import { describe, expect, it } from "vitest";
import { paginateRows, resolveTableColumns } from "../TableWidget";

describe("resolveTableColumns", () => {
  const allHeaders = ["year", "id", "parent_id", "vegetation_emissions"];

  it("defaults to the original key order with no options", () => {
    expect(resolveTableColumns(allHeaders)).toEqual(allHeaders);
  });

  it("hides columns by exact key match", () => {
    expect(
      resolveTableColumns(allHeaders, undefined, ["id", "parent_id"])
    ).toEqual(["year", "vegetation_emissions"]);
  });

  it("reorders named columns first, appending the rest in original order", () => {
    expect(
      resolveTableColumns(allHeaders, ["vegetation_emissions", "year"])
    ).toEqual(["vegetation_emissions", "year", "id", "parent_id"]);
  });

  it("combines ordering and hiding", () => {
    expect(
      resolveTableColumns(
        allHeaders,
        ["vegetation_emissions", "year"],
        ["id", "parent_id"]
      )
    ).toEqual(["vegetation_emissions", "year"]);
  });
});

describe("paginateRows", () => {
  const rows = Array.from({ length: 13 }, (_, i) => i);

  it("pages by 10 rows by default", () => {
    expect(paginateRows(rows, 0)).toEqual({
      pageRows: rows.slice(0, 10),
      startIndex: 0,
      totalPages: 2,
      needsPagination: true,
    });
    expect(paginateRows(rows, 1)).toMatchObject({
      pageRows: [10, 11, 12],
      startIndex: 10,
    });
  });

  it("does not paginate when rows fit on one page", () => {
    expect(paginateRows(rows.slice(0, 10), 0)).toEqual({
      pageRows: rows.slice(0, 10),
      startIndex: 0,
      totalPages: 1,
      needsPagination: false,
    });
  });

  it("renders every row on one page when pageSize is Infinity", () => {
    // startIndex must stay finite: it feeds React row keys.
    expect(paginateRows(rows, 0, Infinity)).toEqual({
      pageRows: rows,
      startIndex: 0,
      totalPages: 1,
      needsPagination: false,
    });
  });
});
