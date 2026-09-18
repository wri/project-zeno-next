import { describe, expect, it } from "vitest";

import {
  DATASET_CARDS,
  IFL_FEATURE_FLAG,
  NET_FLUX_FEATURE_FLAG,
  isViewOnlyDataset,
  type DatasetCardConfig,
} from "@/app/constants/datasets";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";

const IFL_DATASET_ID = 101;
const LGMS_DATASET_ID = 12;

const sample: DatasetCardConfig[] = [
  { dataset_id: 1, dataset_name: "Ungated", description: "" },
  {
    dataset_id: 2,
    dataset_name: "Gated",
    description: "",
    featureFlag: "hidden",
  },
];

describe("filterDatasetsByFeatureFlag", () => {
  it("keeps ungated cards and drops gated ones when no flag is on", () => {
    expect(
      filterDatasetsByFeatureFlag(sample, new Set()).map((c) => c.dataset_id)
    ).toEqual([1]);
  });

  it("keeps a gated card once its flag is on", () => {
    expect(
      filterDatasetsByFeatureFlag(sample, new Set(["hidden"])).map(
        (c) => c.dataset_id
      )
    ).toEqual([1, 2]);
  });

  it("ignores unrelated flags", () => {
    expect(
      filterDatasetsByFeatureFlag(sample, new Set(["other"])).map(
        (c) => c.dataset_id
      )
    ).toEqual([1]);
  });
});

describe("Intact Forest Landscapes catalogue card", () => {
  const ifl = DATASET_CARDS.find((c) => c.dataset_id === IFL_DATASET_ID);

  it("is registered in the catalogue", () => {
    expect(ifl).toBeDefined();
    expect(ifl!.dataset_name).toBe("Intact Forest Landscapes");
  });

  it("is hidden from the catalogue until ?ff=ifl is set", () => {
    const withoutFlag = filterDatasetsByFeatureFlag(DATASET_CARDS, new Set());
    expect(withoutFlag.some((c) => c.dataset_id === IFL_DATASET_ID)).toBe(
      false
    );

    const withFlag = filterDatasetsByFeatureFlag(
      DATASET_CARDS,
      new Set([IFL_FEATURE_FLAG])
    );
    expect(withFlag.some((c) => c.dataset_id === IFL_DATASET_ID)).toBe(true);
  });

  it("is flagged view-only so it renders the VIEW ONLY badge", () => {
    expect(ifl!.viewOnly).toBe(true);
    expect(isViewOnlyDataset(IFL_DATASET_ID)).toBe(true);
  });

  it("carries a raster tile url and the shared IFL legend swatches", () => {
    expect(ifl!.tile_url).toContain("ifl_intact_forest_landscapes");
    expect(ifl!.legend?.type).toBe("symbol");
    expect(ifl!.legend?.items?.[0]).toEqual({
      label: "Intact Forest Landscapes",
      color: "#5C8C50",
    });
  });

  it("leaves analysable datasets unflagged", () => {
    // Tree cover loss — the default landing layer — must stay analysable.
    expect(isViewOnlyDataset(4)).toBe(false);
  });
});

describe("the LGMS net-flux card", () => {
  const lgms = DATASET_CARDS.find((c) => c.dataset_id === LGMS_DATASET_ID);

  it("is registered in the catalogue", () => {
    expect(lgms).toBeDefined();
    expect(lgms!.dataset_name).toBe("Land GHG Monitoring System");
  });

  it("is hidden from the catalogue until ?ff=net-flux is set", () => {
    const withoutFlag = filterDatasetsByFeatureFlag(DATASET_CARDS, new Set());
    expect(withoutFlag.some((c) => c.dataset_id === LGMS_DATASET_ID)).toBe(
      false
    );

    // An unrelated flag must not reveal it either.
    const otherFlag = filterDatasetsByFeatureFlag(
      DATASET_CARDS,
      new Set([IFL_FEATURE_FLAG])
    );
    expect(otherFlag.some((c) => c.dataset_id === LGMS_DATASET_ID)).toBe(false);

    const withFlag = filterDatasetsByFeatureFlag(
      DATASET_CARDS,
      new Set([NET_FLUX_FEATURE_FLAG])
    );
    expect(withFlag.some((c) => c.dataset_id === LGMS_DATASET_ID)).toBe(true);
  });
});

describe("the LGMS sector map layers", () => {
  const LGMS_SECTOR_IDS = [13, 14, 15, 16];
  const cards = LGMS_SECTOR_IDS.map(
    (id) => DATASET_CARDS.find((c) => c.dataset_id === id)!
  );

  it("registers one card per sector layer", () => {
    expect(cards.every(Boolean)).toBe(true);
    expect(cards.map((c) => c.dataset_name)).toEqual([
      "LGMS LULUCF net GHG flux",
      "LGMS agriculture emissions",
      "LGMS cropland emissions",
      "LGMS livestock emissions",
    ]);
  });

  it("hides them behind the same flag as the LGMS analysis card", () => {
    const withoutFlag = filterDatasetsByFeatureFlag(DATASET_CARDS, new Set());
    const withFlag = filterDatasetsByFeatureFlag(
      DATASET_CARDS,
      new Set([NET_FLUX_FEATURE_FLAG])
    );

    for (const id of LGMS_SECTOR_IDS) {
      expect(withoutFlag.some((c) => c.dataset_id === id)).toBe(false);
      expect(withFlag.some((c) => c.dataset_id === id)).toBe(true);
    }
  });

  it("marks them view-only — the analytics endpoint is per-admin-area", () => {
    for (const id of LGMS_SECTOR_IDS) {
      expect(isViewOnlyDataset(id)).toBe(true);
    }
  });

  // The tile server rejects any other `flux_type` with a 422 and the layer
  // then silently never paints, so the exact spelling is worth pinning.
  it("requests each sector with the flux_type the tile server accepts", () => {
    expect(cards.map((c) => c.tile_url)).toEqual([
      expect.stringContaining("?layer=lulucf&flux_type=net"),
      expect.stringContaining("?layer=agriculture&flux_type=gross_emissions"),
      expect.stringContaining("?layer=cropland&flux_type=gross_emissions"),
      expect.stringContaining("?layer=livestock&flux_type=gross_emissions"),
    ]);
    for (const card of cards) {
      expect(card.tile_url).not.toContain("flux_type=net_flux");
    }
  });

  it("gives every card a legend the map legend can render", () => {
    for (const card of cards) {
      const legend = card.legend!;
      expect(legend).toBeDefined();
      expect(["divergent", "sequential"]).toContain(legend.type);
      // The ramp legends label only their two end stops.
      expect(legend.items?.[0]?.label).toBeTruthy();
      expect(legend.items?.[legend.items.length - 1]?.label).toBeTruthy();
    }
  });
});
