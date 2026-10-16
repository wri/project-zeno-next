import { describe, expect, it } from "vitest";

import { areaSourceLabel } from "../areaSourceLabel";

describe("areaSourceLabel", () => {
  it("names every boundary source in singular sentence case", () => {
    expect(areaSourceLabel("gadm")).toBe("Administrative area");
    expect(areaSourceLabel("kba")).toBe("Key biodiversity area");
    expect(areaSourceLabel("wdpa")).toBe("Protected area");
    expect(areaSourceLabel("landmark")).toBe("Indigenous territory");
    expect(areaSourceLabel("custom")).toBe("Custom area");
  });

  it("accepts either case, as the backend and the layer ids disagree", () => {
    expect(areaSourceLabel("GADM")).toBe("Administrative area");
    expect(areaSourceLabel("LandMark")).toBe("Indigenous territory");
  });

  it("capitalises an unknown source and falls back to Area", () => {
    expect(areaSourceLabel("osm")).toBe("Osm");
    expect(areaSourceLabel("")).toBe("Area");
    expect(areaSourceLabel(undefined)).toBe("Area");
    expect(areaSourceLabel(null)).toBe("Area");
  });
});
