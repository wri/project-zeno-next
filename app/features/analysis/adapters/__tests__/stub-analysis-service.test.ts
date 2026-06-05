import { describe, expect, it } from "vitest";
import { StubAnalysisService } from "../stub-analysis-service";

describe("StubAnalysisService", () => {
  it("resolves a canned result derived from the selection's id", async () => {
    const service = new StubAnalysisService();

    const result = await service.run({
      name: "Brazil",
      source: "gadm",
      srcId: "BRA",
    });

    expect(result).toEqual({ id: "stub:gadm:BRA" });
  });

  it("falls back to the name when the selection has no id", async () => {
    const service = new StubAnalysisService();

    const result = await service.run({ name: "My Area", source: "custom" });

    expect(result).toEqual({ id: "stub:custom:My Area" });
  });
});
