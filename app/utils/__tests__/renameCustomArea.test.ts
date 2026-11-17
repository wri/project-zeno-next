import { beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice lazily imports chatStore to fold layer changes into the
// sent context; the stub also stands in for the chat messages renamed here.
const chat = vi.hoisted(() => {
  type State = { messages: unknown[] };
  let state: State = { messages: [] };
  return {
    getState: () => ({ ...state, includeLayerInContext: () => {} }),
    setState: (update: State | ((s: State) => Partial<State>)) => {
      state = {
        ...state,
        ...(typeof update === "function" ? update(state) : update),
      };
    },
  };
});
vi.mock("@/app/store/chatStore", () => ({ default: chat }));

import useMapStore from "@/app/store/mapStore";
import { useSelectionStore } from "@/src/features/analysis";
import { addCustomAreaToMap } from "../addCustomAreaToMap";
import { renameCustomArea } from "../renameCustomArea";

const square: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

const customAoi = (id: string, name: string) => ({
  name,
  src_id: id,
  source: "custom",
  subtype: "custom-area",
});

describe("renameCustomArea", () => {
  beforeEach(() => {
    useMapStore.setState({
      layers: [],
      geoJsonRegistry: [],
      analysisSelection: null,
      flyToGeoJson: vi.fn(),
    });
    useSelectionStore.getState().clear();
    chat.setState({ messages: [] });
  });

  it("relabels the area's map layer and keeps its geometry resolvable", () => {
    addCustomAreaToMap({ id: "a1", name: "Old", geometries: [square] });

    renameCustomArea({ id: "a1", name: "New" });

    const { layers, geoJsonRegistry } = useMapStore.getState();
    expect(layers).toEqual([
      expect.objectContaining({
        id: "a1",
        name: "New",
        featureRefs: [{ name: "New", source: "custom" }],
      }),
    ]);
    expect(geoJsonRegistry).toEqual([
      expect.objectContaining({
        ref: { name: "New", source: "custom" },
        srcId: "a1",
      }),
    ]);
  });

  it("renames the analysis selection of the renamed area", () => {
    addCustomAreaToMap({ id: "a1", name: "Old", geometries: [square] });

    renameCustomArea({ id: "a1", name: "New" });

    expect(useMapStore.getState().analysisSelection?.name).toBe("New");
    expect(useSelectionStore.getState().selection?.name).toBe("New");
  });

  it("leaves another area that shares the old name alone", () => {
    addCustomAreaToMap({ id: "a2", name: "Old", geometries: [square] });

    renameCustomArea({ id: "a1", name: "New" });

    expect(useMapStore.getState().layers[0].name).toBe("Old");
    expect(useMapStore.getState().analysisSelection?.name).toBe("Old");
  });

  it("relabels an agent-picked selection of the area, by its src id", () => {
    const aoi = customAoi("a1", "Old");
    const ref = { name: "Old", source: "custom", srcId: "a1" };
    useMapStore.setState({
      geoJsonRegistry: [
        {
          ref,
          data: { type: "Feature", geometry: square, properties: {} },
          srcId: "a1",
          subtype: "custom-area",
        },
      ],
      layers: [
        {
          id: "Old",
          name: "Old",
          type: "geojson",
          visible: true,
          featureRefs: [ref],
          selectionName: "Old",
          aoiSelection: { name: "Old", aois: [aoi] },
        },
      ],
    });

    renameCustomArea({ id: "a1", name: "New" });

    const [layer] = useMapStore.getState().layers;
    expect(layer).toMatchObject({
      id: "Old",
      name: "New",
      selectionName: "New",
      featureRefs: [{ name: "New", source: "custom", srcId: "a1" }],
      aoiSelection: { name: "New", aois: [customAoi("a1", "New")] },
    });
    expect(useMapStore.getState().geoJsonRegistry[0].ref.name).toBe("New");
  });

  it("keeps a multi-area selection's own label", () => {
    useMapStore.setState({
      layers: [
        {
          id: "Two areas",
          name: "Two areas",
          type: "geojson",
          visible: true,
          selectionName: "Two areas",
          aoiSelection: {
            name: "Two areas",
            aois: [customAoi("a1", "Old"), customAoi("a2", "Other")],
          },
        },
      ],
    });

    renameCustomArea({ id: "a1", name: "New" });

    expect(useMapStore.getState().layers[0]).toMatchObject({
      name: "Two areas",
      aoiSelection: {
        name: "Two areas",
        aois: [customAoi("a1", "New"), customAoi("a2", "Other")],
      },
    });
  });

  it("renames the area cards posted in chat", () => {
    const card = {
      id: "m1",
      type: "area-card",
      aoiSelection: { name: "Old", aois: [customAoi("a1", "Old")] },
    };
    const other = {
      id: "m2",
      type: "area-card",
      aoiSelection: { name: "Elsewhere", aois: [customAoi("a2", "Elsewhere")] },
    };
    chat.setState({ messages: [card, other] });

    renameCustomArea({ id: "a1", name: "New" });

    expect(chat.getState().messages).toEqual([
      {
        ...card,
        aoiSelection: { name: "New", aois: [customAoi("a1", "New")] },
      },
      other,
    ]);
  });
});
