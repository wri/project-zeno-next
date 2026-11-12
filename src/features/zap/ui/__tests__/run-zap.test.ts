import { beforeEach, describe, expect, it, vi } from "vitest";

import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";

import type { ZapPlan } from "../../model/zap-plan";
import useZapStore from "../../model/zap-store";

const fetchZapPlan = vi.fn();
const addDatasetToMap = vi.fn();
const showAoisOnMap = vi.fn();

vi.mock("../../api/zap-client", () => ({
  fetchZapPlan: (...args: unknown[]) => fetchZapPlan(...args),
}));
vi.mock("@/app/store/chat-tools/pickDataset", () => ({
  addDatasetToMap: (...args: unknown[]) => addDatasetToMap(...args),
}));
vi.mock("@/app/store/chat-tools/pickAoi", () => ({
  showAoisOnMap: (...args: unknown[]) => showAoisOnMap(...args),
}));

const { runZap, showZapRow, undoZap, redoZap } = await import("../run-zap");
const { stateChips } = await import("../state-chips");

const currentRow = () => {
  const { rows, index } = useZapStore.getState();
  return rows[index];
};

const AREA = {
  name: "Huelva, Andalucía, Spain",
  source: "gadm",
  src_id: "ESP.1.5_1",
  subtype: "state-province",
};

function plan(steps: ZapPlan["steps"]): ZapPlan {
  return { steps, decisions: [], notes: [] };
}

const DATASET_STEP = {
  kind: "dataset" as const,
  title: "Show Tree cover loss",
  detail: "2015–2025",
  args: { dataset_id: 4, dataset_name: "Tree cover loss" } as never,
};
const AREA_STEP = {
  kind: "area" as const,
  title: "Go to Huelva",
  detail: "",
  args: AREA,
};

describe("runZap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useZapStore.getState().reset();
    useMapStore.setState({ layers: [] });
    showAoisOnMap.mockResolvedValue({ successfulAois: [AREA], failures: [] });
  });

  it("runs the steps in order and hands the chart step to the runner", async () => {
    fetchZapPlan.mockResolvedValue(
      plan([
        DATASET_STEP,
        AREA_STEP,
        {
          kind: "analysis",
          title: "Chart Tree cover loss",
          detail: "",
          args: {
            dataset_id: 4,
            dataset_name: "Tree cover loss",
            area: AREA,
            start_date: "2015-01-01",
            end_date: "2025-12-31",
          },
        },
      ])
    );

    const done = runZap("Deforestation in Huelva");
    await vi.runAllTimersAsync();
    await done;

    expect(addDatasetToMap).toHaveBeenCalledWith(DATASET_STEP.args);
    expect(showAoisOnMap).toHaveBeenCalledWith(
      [expect.objectContaining({ src_id: "ESP.1.5_1" })],
      AREA.name
    );
    const state = useZapStore.getState();
    expect(currentRow().stepStatus).toEqual(["done", "done", "running"]);
    expect(state.pendingAnalysis).toEqual({ rowId: currentRow().id, step: 2 });
    expect(state.status).toBe("running");
  });

  it("skips a chart the backend cannot compute for the area source", async () => {
    fetchZapPlan.mockResolvedValue(
      plan([
        {
          kind: "analysis",
          title: "Chart Tree cover gain",
          detail: "",
          args: {
            dataset_id: 5,
            dataset_name: "Tree cover gain",
            area: { ...AREA, source: "kba" },
            start_date: "2000-01-01",
            end_date: "2020-12-31",
          },
        },
      ])
    );

    const done = runZap("tree cover gain in this KBA");
    await vi.runAllTimersAsync();
    await done;

    expect(currentRow().stepStatus).toEqual(["skipped"]);
    expect(useZapStore.getState().status).toBe("done");
  });

  it("finishes with no steps when the plan is empty", async () => {
    fetchZapPlan.mockResolvedValue(plan([]));

    await runZap("hello");

    expect(useZapStore.getState().status).toBe("done");
    expect(addDatasetToMap).not.toHaveBeenCalled();
  });

  it("reports a failed plan request", async () => {
    fetchZapPlan.mockRejectedValue(new Error("Zap failed (502)"));

    await runZap("fires");

    const state = useZapStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("Zap failed (502)");
  });
});

const PARA = {
  name: "Pará, Brazil",
  source: "gadm",
  src_id: "BRA.14_1",
  subtype: "state-province",
};

/** The map layers as the stubs below write them. */
const layers = () => useMapStore.getState().layers;
const setLayers = (next: Layer[]) => useMapStore.setState({ layers: next });

function datasetStep(id: number, name: string, start: string) {
  return {
    kind: "dataset" as const,
    title: `Show ${name}`,
    detail: "",
    args: {
      dataset_id: id,
      dataset_name: name,
      tile_url: "",
      start_date: start,
      end_date: "2025-12-31",
    },
  };
}

async function zap(prompt: string, result: ZapPlan) {
  fetchZapPlan.mockResolvedValueOnce(result);
  const done = runZap(prompt);
  await vi.runAllTimersAsync();
  await done;
}

describe("zap trail on the map", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useZapStore.getState().reset();
    setLayers([]);
    // Stand-ins for the map tools: they write the layers that the real
    // tools write, without the chat store and the geometry fetch.
    addDatasetToMap.mockImplementation((d) =>
      setLayers([
        ...layers().filter((l) => typeof l.datasetId !== "number"),
        {
          id: `dataset-${d.dataset_id}`,
          name: d.dataset_name,
          type: "raster",
          visible: true,
          datasetId: d.dataset_id,
          startDate: d.start_date,
          endDate: d.end_date,
          parameters: { canopy_cover: 30 },
        },
      ])
    );
    showAoisOnMap.mockImplementation(async (aois, name) => {
      setLayers([
        ...layers().filter((l) => l.id !== name),
        {
          id: name,
          name,
          type: "geojson",
          visible: true,
          aoiSelection: { name, aois },
        },
      ]);
      return { successfulAois: aois, failures: [] };
    });
  });

  it("sends the full map state and keeps the state that the plan returns", async () => {
    await zap("tree cover loss in Pará", {
      ...plan([datasetStep(4, "Tree cover loss", "2001-01-01")]),
      state: { dataset_id: 4, area: PARA, context_layer: "primary_forest" },
    });
    await zap("since 2015", plan([]));

    expect(fetchZapPlan).toHaveBeenLastCalledWith("since 2015", {
      dataset_id: 4,
      area: null,
      start_date: "2001-01-01",
      end_date: "2025-12-31",
      context_layer: null,
      canopy_cover: 30,
    });
    expect(useZapStore.getState().rows[0].state).toEqual({
      dataset_id: 4,
      area: PARA,
      context_layer: "primary_forest",
    });
  });

  it("makes the state from the steps for a backend that sends none", async () => {
    await zap(
      "fires in Pará",
      plan([
        datasetStep(8, "Fires", "2015-01-01"),
        { kind: "area", title: "Go to Pará", detail: "", args: PARA },
      ])
    );

    expect(currentRow().state).toMatchObject({
      dataset_id: 8,
      area: PARA,
      start_date: "2015-01-01",
    });
    expect(stateChips(currentRow().state)).toContain("Pará");
  });

  it("undoes and redoes the map, back to the map before the first request", async () => {
    await zap(
      "loss in Pará",
      plan([
        datasetStep(4, "Tree cover loss", "2001-01-01"),
        { kind: "area", title: "Go to Pará", detail: "", args: PARA },
      ])
    );
    await zap("fires instead", plan([datasetStep(8, "Fires", "2015-01-01")]));
    expect(layers().map((l) => l.id)).toEqual([PARA.name, "dataset-8"]);

    await undoZap();
    expect(useZapStore.getState().index).toBe(0);
    expect(layers().map((l) => l.id)).toEqual(["dataset-4", PARA.name]);
    expect(showAoisOnMap).toHaveBeenLastCalledWith(
      [expect.objectContaining({ src_id: PARA.src_id })],
      PARA.name
    );

    await undoZap();
    expect(useZapStore.getState().index).toBe(-1);
    expect(layers()).toEqual([]);

    // Nothing before the map before zap.
    await undoZap();
    expect(useZapStore.getState().index).toBe(-1);

    await redoZap();
    await redoZap();
    expect(useZapStore.getState().index).toBe(1);
    expect(layers().map((l) => l.id)).toEqual(["dataset-8", PARA.name]);
  });

  it("removes the later rows when a request starts from an older row", async () => {
    await zap("a", plan([datasetStep(4, "Tree cover loss", "2001-01-01")]));
    await zap("b", plan([datasetStep(8, "Fires", "2015-01-01")]));
    await showZapRow(0);

    await zap("c", plan([datasetStep(5, "Tree cover gain", "2001-01-01")]));

    expect(useZapStore.getState().rows.map((r) => r.prompt)).toEqual([
      "a",
      "c",
    ]);
    // The request started from the map of row "a".
    expect(fetchZapPlan).toHaveBeenLastCalledWith(
      "c",
      expect.objectContaining({ dataset_id: 4 })
    );
  });

  it("does not move in the trail while a plan is in progress", async () => {
    await zap("a", plan([datasetStep(4, "Tree cover loss", "2001-01-01")]));
    useZapStore.setState({ status: "running" });

    await undoZap();

    expect(useZapStore.getState().index).toBe(0);
    expect(layers().map((l) => l.id)).toEqual(["dataset-4"]);
  });
});
