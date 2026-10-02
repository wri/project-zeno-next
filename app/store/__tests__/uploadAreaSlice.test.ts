import { describe, it, expect, beforeEach } from "vitest";
import useMapStore from "../mapStore";

// Validation, upload and the in-flight close guard moved to the shared
// feature: src/entities/custom-area and src/features/area-upload tests.
describe("uploadAreaSlice", () => {
  beforeEach(() => {
    useMapStore.setState({ dialogVisible: false, selectionMode: undefined });
  });

  it("toggles the dialog open and closed", () => {
    useMapStore.getState().toggleUploadAreaDialog();
    expect(useMapStore.getState().dialogVisible).toBe(true);

    useMapStore.getState().toggleUploadAreaDialog();
    expect(useMapStore.getState().dialogVisible).toBe(false);
  });

  it("clears the selection mode when the dialog closes", () => {
    useMapStore.setState({
      dialogVisible: true,
      selectionMode: { type: "Uploading", name: undefined },
    });

    useMapStore.getState().toggleUploadAreaDialog();

    expect(useMapStore.getState().selectionMode).toBeUndefined();
  });
});
