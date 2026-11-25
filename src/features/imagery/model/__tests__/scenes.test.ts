import { describe, expect, it } from "vitest";
import { selectScenes, summarizeScenes, type StacItem } from "../scenes";

function item(
  id: string,
  datetime: string,
  cloud: number,
  tile: string
): StacItem {
  return {
    id,
    bbox: [0, 0, 1, 1],
    properties: {
      datetime: `${datetime}T14:35:00Z`,
      "eo:cloud_cover": cloud,
      "grid:code": tile,
    },
    assets: {
      visual: { href: `https://cogs/${id}/TCI.tif` },
      thumbnail: { href: `https://cogs/${id}/preview.jpg` },
    },
  };
}

const ids = (scenes: { id: string }[]) => scenes.map((s) => s.id);

describe("selectScenes", () => {
  const window = [
    item("far", "2026-06-25", 1, "A"),
    item("near-cloudy", "2026-06-16", 30, "B"),
    item("near-clear", "2026-06-14", 5, "C"),
  ];

  it("by default puts the least cloudy first, then the nearest date", () => {
    expect(ids(selectScenes(window, "2026-06-15"))).toEqual([
      "far",
      "near-clear",
      "near-cloudy",
    ]);
  });

  it("with sort=date orders by days from the date, then cloud cover", () => {
    expect(ids(selectScenes(window, "2026-06-15", undefined, "date"))).toEqual([
      "near-clear",
      "near-cloudy",
      "far",
    ]);
  });

  it("keeps the least cloudy scenes of each tile", () => {
    const scenes = selectScenes(
      [
        item("a-near-cloudy", "2026-06-15", 45, "A"),
        item("a-far-clear", "2026-06-02", 3, "A"),
        item("a-mid", "2026-06-10", 20, "A"),
      ],
      "2026-06-15",
      { maxScenesPerTile: 2, maxScenes: 10 }
    );
    expect(scenes.map((s) => [s.id, s.rank])).toEqual([
      ["a-far-clear", 0],
      ["a-mid", 1],
    ]);
  });

  it("ranks scenes within their MGRS tile and caps each tile", () => {
    const scenes = selectScenes(
      [
        item("a1", "2026-06-15", 5, "A"),
        item("a2", "2026-06-10", 5, "A"),
        item("a3", "2026-06-05", 5, "A"),
        item("b1", "2026-06-12", 5, "B"),
      ],
      "2026-06-15",
      { maxScenesPerTile: 2, maxScenes: 10 },
      "date"
    );
    expect(scenes.map((s) => [s.id, s.rank])).toEqual([
      ["a1", 0],
      ["b1", 0],
      ["a2", 1],
    ]);
  });

  it("drops the worst ranks first when over the total cap", () => {
    const scenes = selectScenes(
      [
        item("a1", "2026-06-15", 5, "A"),
        item("a2", "2026-06-14", 5, "A"),
        item("b1", "2026-06-01", 5, "B"),
        item("c1", "2026-06-02", 5, "C"),
      ],
      "2026-06-15",
      { maxScenesPerTile: 2, maxScenes: 3 },
      "date"
    );
    // a2 is nearer the date than b1 and c1, but every tile keeps its best.
    expect(ids(scenes)).toEqual(["a1", "c1", "b1"]);
  });

  it("skips items without a visual asset, bbox or date", () => {
    const noVisual = { ...item("x", "2026-06-15", 5, "A"), assets: {} };
    const noBbox = { ...item("y", "2026-06-15", 5, "A"), bbox: undefined };
    expect(selectScenes([noVisual, noBbox], "2026-06-15")).toEqual([]);
  });
});

describe("summarizeScenes", () => {
  it("gives the count, date range and cloud stats", () => {
    const scenes = selectScenes(
      [
        item("a", "2026-06-10", 10, "A"),
        item("b", "2026-06-18", 20, "B"),
        item("c", "2026-06-14", 0, "C"),
      ],
      "2026-06-15"
    );
    expect(summarizeScenes(scenes)).toEqual({
      itemCount: 3,
      startDate: "2026-06-10",
      endDate: "2026-06-18",
      meanCloudCover: 10,
      minCloudCover: 0,
      maxCloudCover: 20,
    });
  });

  it("is a zero count when there are no scenes", () => {
    expect(summarizeScenes([])).toEqual({ itemCount: 0 });
  });
});
