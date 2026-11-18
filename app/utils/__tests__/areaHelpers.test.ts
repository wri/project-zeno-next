import { describe, expect, it } from "vitest";

import { boundaryLayerId } from "../areaHelpers";

describe("boundaryLayerId", () => {
  it("maps every backend concession source to its layer", () => {
    expect(boundaryLayerId("oil_palm")).toBe("OIL_PALM");
    expect(boundaryLayerId("rspo_oil_palm")).toBe("RSPO_OIL_PALM");
    expect(boundaryLayerId("logging")).toBe("LOGGING");
    expect(boundaryLayerId("mining")).toBe("MINING");
    expect(boundaryLayerId("wood_fiber")).toBe("WOOD_FIBER");
  });

  it("matches ids that are not all upper case", () => {
    expect(boundaryLayerId("landmark")).toBe("LandMark");
  });

  it("resolves a layer id to itself", () => {
    expect(boundaryLayerId("OIL_PALM")).toBe("OIL_PALM");
  });

  it("returns undefined for an unknown source", () => {
    expect(boundaryLayerId("soy")).toBeUndefined();
  });
});
