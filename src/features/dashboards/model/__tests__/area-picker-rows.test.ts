import { describe, expect, it } from "vitest";

import {
  buildPreviousAnalysesMap,
  customAreaToRow,
  aoiSearchResultToRow,
  filterRowsBySearch,
  type AreaPickerRow,
} from "../area-picker-rows";
import type { Dashboard } from "../../api/schemas";

const dashboard = (aois: Dashboard["aois"]): Dashboard => ({
  id: "d1",
  user_id: "u1",
  name: "Test",
  description: null,
  is_public: false,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  aois,
  sections: [],
  widgets: [],
});

describe("buildPreviousAnalysesMap", () => {
  it("counts dashboards per source+src_id", () => {
    const dashboards = [
      dashboard([
        {
          id: "aoi-1",
          position: 0,
          source: "gadm",
          src_id: "BRA.16_1",
          subtype: "adm1",
          name: "Paraná",
        },
      ]),
      dashboard([
        {
          id: "aoi-2",
          position: 0,
          source: "gadm",
          src_id: "BRA.16_1",
          subtype: "adm1",
          name: "Paraná",
        },
      ]),
      dashboard([
        {
          id: "aoi-3",
          position: 0,
          source: "custom",
          src_id: "area-1",
          subtype: "custom-area",
          name: "Farm",
        },
      ]),
    ];

    const map = buildPreviousAnalysesMap(dashboards);

    expect(map.get("gadm:BRA.16_1")).toBe(2);
    expect(map.get("custom:area-1")).toBe(1);
    expect(map.get("kba:missing")).toBeUndefined();
  });

  it("returns an empty map for no dashboards", () => {
    expect(buildPreviousAnalysesMap([]).size).toBe(0);
  });
});

describe("row mappers", () => {
  const analysesMap = new Map([["gadm:BRA.16_1", 3]]);

  it("maps an AOI search result to a row with its analyses count", () => {
    const row = aoiSearchResultToRow(
      {
        source: "gadm",
        src_id: "BRA.16_1",
        subtype: "adm1",
        name: "Paraná",
        bbox: [0, 0, 1, 1],
      },
      "Administrative areas",
      analysesMap
    );

    expect(row).toEqual<AreaPickerRow>({
      source: "gadm",
      src_id: "BRA.16_1",
      subtype: "adm1",
      name: "Paraná",
      typeLabel: "Administrative areas",
      previousAnalyses: 3,
      bbox: [0, 0, 1, 1],
    });
  });

  it("defaults previousAnalyses to 0 when the area has no dashboards yet", () => {
    const row = aoiSearchResultToRow(
      {
        source: "kba",
        src_id: "kba-1",
        subtype: "site",
        name: "Some KBA",
        bbox: [0, 0, 1, 1],
      },
      "Key biodiversity areas",
      analysesMap
    );

    expect(row.previousAnalyses).toBe(0);
  });

  it("maps a saved custom area to a row", () => {
    const row = customAreaToRow(
      { id: "area-1", name: "My farm" },
      new Map([["custom:area-1", 5]])
    );

    expect(row).toEqual<AreaPickerRow>({
      source: "custom",
      src_id: "area-1",
      subtype: "custom-area",
      name: "My farm",
      typeLabel: "Custom area",
      previousAnalyses: 5,
    });
  });
});

describe("filterRowsBySearch", () => {
  const rows: AreaPickerRow[] = [
    {
      source: "gadm",
      src_id: "1",
      subtype: "adm1",
      name: "Paraná",
      typeLabel: "Administrative areas",
      previousAnalyses: 0,
    },
    {
      source: "wdpa",
      src_id: "2",
      subtype: "park",
      name: "Virunga",
      typeLabel: "Protected areas",
      previousAnalyses: 5,
    },
  ];

  it("returns all rows when search is empty", () => {
    expect(filterRowsBySearch(rows, "")).toEqual(rows);
  });

  it("filters case-insensitively by name substring", () => {
    expect(filterRowsBySearch(rows, "vir")).toEqual([rows[1]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterRowsBySearch(rows, "nonexistent")).toEqual([]);
  });
});
