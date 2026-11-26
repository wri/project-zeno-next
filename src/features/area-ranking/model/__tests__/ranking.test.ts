import { describe, expect, it } from "vitest";

import { parseRanking, rankingTableProps } from "../ranking";

const row = (overrides: Record<string, unknown> = {}) => ({
  rank: 1,
  aoi_id: "KEN.33",
  name: "Narok",
  parent: "Kenya",
  area_ha: 72050.31,
  share_pct: 60,
  ...overrides,
});

const ROWS = [
  row(),
  row({
    rank: 2,
    aoi_id: "KEN.32",
    name: "Nakuru",
    area_ha: 48000,
    share_pct: 40,
  }),
  row({
    rank: 3,
    aoi_id: "KEN.30",
    name: "Nairobi",
    parent: null,
    area_ha: 0,
    share_pct: 0,
  }),
];

const withoutShare = (rows: Record<string, unknown>[]) =>
  rows.map((r) => ({ ...r, share_pct: undefined }));

describe("parseRanking", () => {
  it("reads every field of every row, in the wire order", () => {
    expect(parseRanking(ROWS, "area_ha")).toEqual({
      measure: "loss",
      unit: "ha",
      areas: [
        {
          aoiId: "KEN.33",
          rank: 1,
          name: "Narok",
          parent: "Kenya",
          value: 72050.31,
          share: 60,
        },
        {
          aoiId: "KEN.32",
          rank: 2,
          name: "Nakuru",
          parent: "Kenya",
          value: 48000,
          share: 40,
        },
        {
          aoiId: "KEN.30",
          rank: 3,
          name: "Nairobi",
          value: 0,
          share: 0,
        },
      ],
    });
  });

  it("names the measure and unit of the emissions column", () => {
    const rows = [row({ carbon_emissions_MgCO2e: 5, area_ha: undefined })];
    const ranking = parseRanking(withoutShare(rows), "carbon_emissions_MgCO2e");
    expect(ranking.measure).toBe("emissions");
    expect(ranking.unit).toBe("MgCO₂e");
  });

  it("leaves share off every area when no row has one", () => {
    const { areas } = parseRanking(withoutShare(ROWS), "area_ha");
    expect(areas.every((area) => !("share" in area))).toBe(true);
  });

  it("sets the qualifier of the areas that share a name", () => {
    const { areas } = parseRanking(
      [
        row({
          aoi_id: "BRA.1",
          name: "Bom Jesus",
          parent: "Piauí",
          share_pct: 50,
        }),
        row({
          rank: 2,
          aoi_id: "BRA.2",
          name: "Bom Jesus",
          parent: "Rio Grande do Sul",
          share_pct: 30,
        }),
        row({
          rank: 3,
          aoi_id: "BRA.3",
          name: "Belém",
          parent: "Pará",
          share_pct: 20,
        }),
      ].map((r) => ({ ...r, area_ha: Number(r.share_pct) })),
      "area_ha"
    );
    expect(areas.map((area) => area.qualifier)).toEqual([
      "Piauí",
      "Rio Grande do Sul",
      undefined,
    ]);
  });

  it("leaves the qualifier off a repeated name that has no parent", () => {
    const { areas } = parseRanking(
      [row({ parent: null }), row({ rank: 2, aoi_id: "KEN.1", parent: null })],
      "area_ha"
    );
    expect(areas.map((area) => area.parent)).toEqual([undefined, undefined]);
    expect(areas.map((area) => area.qualifier)).toEqual([undefined, undefined]);
  });

  it("keeps rows that tie", () => {
    const { areas } = parseRanking(
      [row({ rank: 1 }), row({ rank: 1, aoi_id: "KEN.1", name: "B" })],
      "area_ha"
    );
    expect(areas.map((area) => area.rank)).toEqual([1, 1]);
  });

  describe("throws, naming the problem, on", () => {
    const rejects = (data: unknown, message: RegExp, yAxis = "area_ha") =>
      expect(() => parseRanking(data, yAxis)).toThrow(message);

    it("data that is not a list, or is empty", () => {
      rejects("rows", /not a list of rows/);
      rejects([], /not a list of rows/);
    });

    it("a row that is not an object", () =>
      rejects([null], /row 0 is not an object/));

    it.each(["rank", "name", "aoi_id"])("a row with no %s", (key) =>
      rejects(
        [row({ [key]: undefined })],
        new RegExp(`row 0 has no (numeric )?${key}`)
      )
    );

    it("a rank or name of the wrong type", () => {
      rejects([row({ rank: "1" })], /numeric rank/);
      rejects([row({ name: 7 })], /no name/);
    });

    it("a value that is missing, not a number or negative", () => {
      rejects([row({ area_ha: undefined })], /numeric area_ha/);
      rejects([row({ area_ha: "5" })], /numeric area_ha/);
      rejects([row({ area_ha: Number.NaN })], /numeric area_ha/);
      rejects([row({ area_ha: -1 })], /negative area_ha/);
    });

    it("a parent that is neither a string nor null", () => {
      rejects([row({ parent: undefined })], /no parent/);
      rejects([row({ parent: 3 })], /no parent/);
    });

    it("share_pct on some rows only, or not a number", () => {
      rejects(
        [
          row(),
          ...withoutShare([row({ rank: 2, aoi_id: "KEN.1", area_ha: 1 })]),
        ],
        /some rows only/
      );
      rejects([row({ share_pct: null })], /numeric share_pct/);
    });

    it("an area that appears twice", () =>
      rejects([row(), row({ rank: 2, area_ha: 1 })], /row 1 repeats KEN.33/));

    it("a value column it has no wording for", () =>
      rejects([row()], /unknown value column "tree_ha"/, "tree_ha"));

    it("a value above the row before it", () =>
      rejects(
        [row({ area_ha: 1 }), row({ rank: 2, aoi_id: "KEN.1", area_ha: 2 })],
        /row 1 is larger than the row before it/
      ));

    it("a chart where every value is 0", () =>
      rejects([row({ area_ha: 0 })], /every value is 0/));
  });
});

describe("rankingTableProps", () => {
  it("orders the table's columns by the chart's value column and hides the id", () => {
    expect(rankingTableProps("area_ha")).toEqual({
      columnOrder: ["rank", "name", "parent", "area_ha", "share_pct"],
      hiddenColumns: ["aoi_id"],
    });
  });
});
