import { describe, expect, it } from "vitest";

import { datasetMeta } from "@/app/utils/datasetMeta";

describe("datasetMeta", () => {
  it("joins cadence, coverage and provider with middots", () => {
    expect(
      datasetMeta({
        cadence: "annual",
        geographic_coverage: "global",
        provider: "UMD",
      })
    ).toBe("annual · global · UMD");
  });

  it("skips missing parts", () => {
    expect(datasetMeta({ geographic_coverage: "global" })).toBe("global");
  });

  it("returns undefined when there is nothing to show", () => {
    expect(datasetMeta({})).toBeUndefined();
  });
});
