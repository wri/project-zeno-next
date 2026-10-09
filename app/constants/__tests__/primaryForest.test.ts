import { describe, expect, it } from "vitest";

import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
  ORDERED_DATASET_CARDS,
  isViewOnlyDataset,
} from "@/app/constants/datasets";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";

/**
 * The colour the UMD primary forest tiles actually paint (sampled from the
 * published v201901 PNGs). The legend has to match what is on the map.
 */
const TILE_COLOR = "#668636";

const primaryForest = CONTEXT_LAYER_METADATA.primary_forest;
const card = DATASET_CARDS.find(
  (c) => c.dataset_id === primaryForest.dataset_id
);

describe("Primary Forests catalogue card", () => {
  it("is a standalone, view-only dataset", () => {
    expect(card).toBeDefined();
    expect(card!.dataset_name).toBe("Primary Forests");
    expect(card!.viewOnly).toBe(true);
    expect(isViewOnlyDataset(primaryForest.dataset_id)).toBe(true);
  });

  it("is listed in the catalogue without a feature flag", () => {
    expect(card!.featureFlag).toBeUndefined();
    expect(
      filterDatasetsByFeatureFlag(ORDERED_DATASET_CARDS, new Set()).some(
        (c) => c.dataset_id === primaryForest.dataset_id
      )
    ).toBe(true);
  });

  it("renders the UMD primary forest tiles with a thumbnail", () => {
    expect(card!.tile_url).toContain("umd_regional_primary_forest_2001");
    expect(card!.img).toBe("/dataset_card_primary_forest.webp");
  });

  it("shares one legend with the context sub-layer", () => {
    expect(card!.legend).toBe(primaryForest.legend);
  });

  it("uses the colour the tiles paint in its legend", () => {
    expect(primaryForest.legend.color).toBe(TILE_COLOR);
    expect(primaryForest.legend.items).toEqual([
      { label: "Primary forest", color: TILE_COLOR },
    ]);
  });
});
