import { describe, expect, it } from "vitest";

import type { DatasetCardConfig } from "@/app/constants/datasets";
import { searchDatasets } from "@/app/utils/searchDatasets";

const cards: DatasetCardConfig[] = [
  {
    dataset_id: 1,
    dataset_name: "Tree cover loss",
    description: "Deforestation everywhere",
    cadence: "annual",
    geographic_coverage: "global",
    provider: "UMD",
    categories: ["forests"],
  },
  {
    dataset_id: 2,
    dataset_name: "Integrated alerts",
    description: "",
    cadence: "daily",
    provider: "GFW",
    categories: ["disturbance"],
  },
  {
    dataset_id: 3,
    dataset_name: "Tree cover loss due to fires",
    description: "",
    categories: ["wildfires"],
  },
  // Like most real cards: no categories, no meta fields.
  { dataset_id: 4, dataset_name: "Primary Forests", description: "" },
];

const ids = (query: string) =>
  searchDatasets(cards, query).map((c) => c.dataset_id);

describe("searchDatasets", () => {
  it("returns every card for an empty or blank query", () => {
    expect(ids("")).toEqual([1, 2, 3, 4]);
    expect(ids("   ")).toEqual([1, 2, 3, 4]);
  });

  it("matches the name as a case-insensitive substring", () => {
    expect(ids("ALERTS")).toEqual([2]);
    expect(ids("tree cover")).toEqual([1, 3]);
  });

  it("matches cadence, coverage and provider", () => {
    expect(ids("daily")).toEqual([2]);
    expect(ids("global")).toEqual([1]);
    expect(ids("umd")).toEqual([1]);
  });

  it("matches a card with no categories or meta by name", () => {
    expect(ids("primary")).toEqual([4]);
  });

  it("matches category labels, not ids", () => {
    expect(ids("wildfire")).toEqual([3]);
    expect(ids("land-use")).toEqual([]);
  });

  it("ignores surrounding whitespace", () => {
    expect(ids("  gfw ")).toEqual([2]);
  });

  it("does not match description text", () => {
    expect(ids("deforestation")).toEqual([]);
  });
});
