import { beforeEach, describe, expect, it } from "vitest";

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";

const layer = (id: string, datasetId?: number) => ({
  id,
  name: id,
  type: "geojson" as const,
  visible: true,
  ...(datasetId !== undefined ? { datasetId } : {}),
});

const excluded = () => useChatStore.getState().excludedContextLayerIds;

// A layer the user removed from the chat context (its chip ✕) rejoins the
// context once it's added to or removed from the map again. This runs in
// step with the map change, not on a later tick, so nothing settles after
// the caller (or a test) is done.
describe("layer changes rejoin the chat context", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useChatStore.getState().reset();
  });

  it("on addLayer", () => {
    useChatStore.getState().excludeLayerFromContext("a");
    useMapStore.getState().addLayer(layer("a"));
    expect(excluded()).toEqual([]);
  });

  it("on removeLayer", () => {
    useMapStore.getState().addLayer(layer("a"));
    useChatStore.getState().excludeLayerFromContext("a");
    useMapStore.getState().removeLayer("a");
    expect(excluded()).toEqual([]);
  });

  it("on removeDatasetLayers, for each removed layer only", () => {
    useMapStore.getState().addLayer(layer("dataset-4", 4));
    useMapStore.getState().addLayer(layer("dataset-7", 7));
    useChatStore.getState().excludeLayerFromContext("dataset-4");
    useChatStore.getState().excludeLayerFromContext("dataset-7");

    useMapStore.getState().removeDatasetLayers(4);

    expect(excluded()).toEqual(["dataset-7"]);
  });
});
