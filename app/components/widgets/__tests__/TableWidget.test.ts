import { describe, expect, it } from "vitest";
import { resolveTableColumns } from "../TableWidget";

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
