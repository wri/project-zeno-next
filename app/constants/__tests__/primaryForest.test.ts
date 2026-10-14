import { describe, expect, it } from "vitest";

import { ORDERED_DATASET_CARDS } from "@/app/constants/datasets";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";

describe("Primary Forests catalogue card", () => {
  it("is listed without a feature flag, as view-only", () => {
    const card = filterDatasetsByFeatureFlag(
      ORDERED_DATASET_CARDS,
      new Set()
    ).find((c) => c.dataset_id === 100);
    expect(card?.viewOnly).toBe(true);
  });
});
