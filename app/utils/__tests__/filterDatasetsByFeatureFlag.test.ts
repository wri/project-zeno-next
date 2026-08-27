import { describe, expect, it } from "vitest";

import {
  DATASET_CARDS,
  IFL_FEATURE_FLAG,
  isViewOnlyDataset,
  type DatasetCardConfig,
} from "@/app/constants/datasets";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";

const IFL_DATASET_ID = 101;

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
