import { beforeEach, describe, expect, it } from "vitest";
import useSelectionStore from "../selection-store";
import type { AreaSelection } from "../../domain/area-selection";

const selection: AreaSelection = {
  name: "Brazil",
  source: "gadm",
  srcId: "BRA",
};
const lngLat = { lng: -51.9, lat: -14.2 };

describe("selectionStore", () => {
  beforeEach(() => {
    useSelectionStore.getState().clear();
  });

  it("starts empty", () => {
    const state = useSelectionStore.getState();
    expect(state.selection).toBeNull();
    expect(state.lngLat).toBeNull();
  });

  it("stores a selection with its anchor", () => {
    useSelectionStore.getState().select(selection, lngLat);

    const state = useSelectionStore.getState();
    expect(state.selection).toEqual(selection);
    expect(state.lngLat).toEqual(lngLat);
  });

  it("clears the selection", () => {
    useSelectionStore.getState().select(selection, lngLat);
    useSelectionStore.getState().clear();

    const state = useSelectionStore.getState();
    expect(state.selection).toBeNull();
    expect(state.lngLat).toBeNull();
  });
});
