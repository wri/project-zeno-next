import { beforeEach, describe, expect, it } from "vitest";
import useSelectionStore from "../selection-store";
import type { AreaSelection } from "../area-selection";

const selection: AreaSelection = {
  name: "Brazil",
  source: "gadm",
  srcId: "BRA",
};

describe("selectionStore", () => {
  beforeEach(() => {
    useSelectionStore.getState().clear();
  });

  it("starts empty", () => {
    expect(useSelectionStore.getState().selection).toBeNull();
  });

  it("stores a selection", () => {
    useSelectionStore.getState().select(selection);
    expect(useSelectionStore.getState().selection).toEqual(selection);
  });

  it("clears the selection", () => {
    useSelectionStore.getState().select(selection);
    useSelectionStore.getState().clear();
    expect(useSelectionStore.getState().selection).toBeNull();
  });
});
