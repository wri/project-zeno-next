import { describe, expect, it } from "vitest";

import {
  aoiSearchResultToDashboardAoi,
  customAreaToDashboardAoi,
  isValidDashboardAreaSelection,
  REFERENCE_AOI_SOURCES,
  REFERENCE_AOI_SOURCE_LABELS,
} from "../dashboard-area";

describe("dashboard-area mappers", () => {
  it("maps each reference source to a valid dashboard AOI payload", () => {
    for (const source of REFERENCE_AOI_SOURCES) {
      const aoi = aoiSearchResultToDashboardAoi({
        source,
        src_id: `${source}-123`,
        subtype: `${source}-subtype`,
        name: `Test ${source}`,
        bbox: [0, 0, 1, 1],
      });
      expect(isValidDashboardAreaSelection(aoi)).toBe(true);
      expect(aoi).toEqual({
        source,
        src_id: `${source}-123`,
        subtype: `${source}-subtype`,
        name: `Test ${source}`,
      });
    }
  });

  it("maps a saved custom area to dashboard AOI fields", () => {
    const aoi = customAreaToDashboardAoi({
      id: "area-uuid",
      user_id: "user-1",
      name: "My farm",
      geometries: [],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    });
    expect(aoi).toEqual({
      source: "custom",
      src_id: "area-uuid",
      subtype: "custom-area",
      name: "My farm",
    });
    expect(isValidDashboardAreaSelection(aoi)).toBe(true);
  });

  it("rejects incomplete selections", () => {
    expect(isValidDashboardAreaSelection(null)).toBe(false);
    expect(
      isValidDashboardAreaSelection({
        source: "gadm",
        src_id: "",
        subtype: "country",
        name: "Brazil",
      })
    ).toBe(false);
  });

  it("labels the landmark source as Indigenous lands", () => {
    expect(REFERENCE_AOI_SOURCE_LABELS.landmark).toBe("Indigenous lands");
  });
});
