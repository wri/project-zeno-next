import { describe, expect, it } from "vitest";

import { areaTypeLabel } from "../areaTypeLabel";

describe("areaTypeLabel", () => {
  it("names every boundary source in singular sentence case", () => {
    expect(areaTypeLabel("gadm")).toBe("Administrative area");
    expect(areaTypeLabel("kba")).toBe("Key biodiversity area");
    expect(areaTypeLabel("wdpa")).toBe("Protected area");
    expect(areaTypeLabel("landmark")).toBe("Indigenous territory");
    expect(areaTypeLabel("custom")).toBe("Custom area");
  });

  it("accepts either case, as the backend and the layer ids disagree", () => {
    expect(areaTypeLabel("GADM")).toBe("Administrative area");
    expect(areaTypeLabel("LandMark")).toBe("Indigenous territory");
  });

  it("capitalises an unknown source and falls back to Area", () => {
    expect(areaTypeLabel("osm")).toBe("Osm");
    expect(areaTypeLabel("")).toBe("Area");
    expect(areaTypeLabel(undefined)).toBe("Area");
    expect(areaTypeLabel(null)).toBe("Area");
  });
});
