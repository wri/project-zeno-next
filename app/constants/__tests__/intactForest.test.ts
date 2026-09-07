import { describe, expect, it } from "vitest";

import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
  IFL_FEATURE_FLAG,
} from "@/app/constants/datasets";

/**
 * The IFL symbology is not ours to invent: the raster tiles ship a fixed
 * colormap and the flagship map (globalnaturewatch.org) publishes the matching
 * legend. Researchers compare the two side by side (PZB-1231), so these values
 * are pinned here rather than left to drift.
 */
const FLAGSHIP_COLORS = {
  extent: "#5C8C50",
  reduction2000_2013: "#8B8B2A",
  reduction2013_2016: "#6B6B2A",
  reduction2016_2020: "#4A4A2A",
  reduction2020_2025: "#2D2D2D",
} as const;

const intactForest = CONTEXT_LAYER_METADATA.intact_forest;
const iflCard = DATASET_CARDS.find(
  (card) => card.featureFlag === IFL_FEATURE_FLAG
);

describe("Intact Forest Landscapes legend", () => {
  it("matches the flagship symbology on the standalone v2025 card", () => {
    expect(iflCard?.legend?.items).toEqual([
      { label: "Intact Forest Landscapes", color: FLAGSHIP_COLORS.extent },
      {
        label: "Reduction in extent 2000-2013",
        color: FLAGSHIP_COLORS.reduction2000_2013,
      },
      {
        label: "Reduction in extent 2013-2016",
        color: FLAGSHIP_COLORS.reduction2013_2016,
      },
      {
        label: "Reduction in extent 2016-2020",
        color: FLAGSHIP_COLORS.reduction2016_2020,
      },
      {
        label: "Reduction in extent 2020-2025",
        color: FLAGSHIP_COLORS.reduction2020_2025,
      },
    ]);
  });

  it("shares one legend between the card and the context sub-layer", () => {
    // The backend serves the `intact_forest` context layer from the same
    // v2025 raster as the standalone card, so the two must not drift.
    expect(intactForest.legend).toBe(iflCard?.legend);
  });
});

describe("Intact Forest Landscapes vector style", () => {
  // Decoded straight from the v2021 MVT tiles: every polygon carries the
  // *start* year of the epoch it belongs to, and the surviving extent is
  // stamped with the tileset vintage.
  //
  //   year 2000 -> ifl_2013_reduction_buffer   (lost 2000-2013)
  //   year 2013 -> ifl_2016_reduction_buffer   (lost 2013-2016)
  //   year 2016 -> ifl_2020_reduction_buffer   (lost 2016-2020)
  //   year 2020 -> ifl_2020_buff               (still intact)
  it("keys on the tiles' own year encoding", () => {
    expect(intactForest.vectorStyle?.property).toBe("year");
    expect(intactForest.vectorStyle?.colorMap).toEqual([
      { value: 2020, color: FLAGSHIP_COLORS.extent },
      { value: 2000, color: FLAGSHIP_COLORS.reduction2000_2013 },
      { value: 2013, color: FLAGSHIP_COLORS.reduction2013_2016 },
      { value: 2016, color: FLAGSHIP_COLORS.reduction2016_2020 },
    ]);
  });

  it("paints the surviving extent, not the first reduction epoch", () => {
    // Regression guard: the original spec mapped year 2000 to the intact
    // green, which painted the 2000-2013 *loss* polygons as intact forest
    // and hid the extent entirely.
    const byYear = new Map(
      intactForest.vectorStyle?.colorMap.map((c) => [c.value, c.color])
    );
    expect(byYear.get(2020)).toBe(FLAGSHIP_COLORS.extent);
    expect(byYear.get(2000)).not.toBe(FLAGSHIP_COLORS.extent);
  });

  it("draws only colours the legend accounts for", () => {
    // v2021 has no 2020-2025 epoch, so the style is a subset of the legend —
    // but it must never invent a colour the legend cannot explain.
    const legendColors = new Set(
      intactForest.legend.items?.map((i) => i.color)
    );
    for (const { color } of intactForest.vectorStyle?.colorMap ?? []) {
      expect(legendColors).toContain(color);
    }
  });
});
