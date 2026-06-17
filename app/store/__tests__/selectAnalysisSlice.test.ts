import { describe, it, expect, beforeEach, vi } from "vitest";

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import useMapStore from "../mapStore";
import type { AnalysisSelection } from "../selectAnalysisSlice";

const selection: AnalysisSelection = {
  name: "Pará, Brazil",
  source: "gadm",
  srcId: "BRA.14_1",
  subtype: "adm1",
};

describe("selectAnalysisSlice", () => {
  beforeEach(() => {
    useMapStore.getState().clearAnalysis();
  });

  it("starts with no selection", () => {
    expect(useMapStore.getState().analysisSelection).toBeNull();
  });

  it("setAnalysis stores the selection", () => {
    useMapStore.getState().setAnalysis(selection);
    expect(useMapStore.getState().analysisSelection).toEqual(selection);
  });

  it("setAnalysis replaces a previous selection (one at a time)", () => {
    useMapStore.getState().setAnalysis(selection);
    useMapStore
      .getState()
      .setAnalysis({ name: "Acre, Brazil", source: "gadm" });
    expect(useMapStore.getState().analysisSelection?.name).toBe("Acre, Brazil");
  });

  it("setAnalysis accepts a selection without srcId/subtype", () => {
    useMapStore.getState().setAnalysis({ name: "Brazil", source: "gadm" });
    const stored = useMapStore.getState().analysisSelection;
    expect(stored?.srcId).toBeUndefined();
    expect(stored?.subtype).toBeUndefined();
  });

  it("clearAnalysis resets the selection", () => {
    useMapStore.getState().setAnalysis(selection);
    useMapStore.getState().clearAnalysis();
    expect(useMapStore.getState().analysisSelection).toBeNull();
  });

  it("mapStore.reset() clears the selection (new thread)", () => {
    useMapStore.getState().setAnalysis(selection);
    useMapStore.getState().reset();
    expect(useMapStore.getState().analysisSelection).toBeNull();
  });
});
