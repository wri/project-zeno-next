import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/store/mapStore", () => ({
  default: {
    getState: () => ({ addLayer: vi.fn(), removeLayer: vi.fn(), layers: [] }),
  },
}));

vi.mock("@/app/utils/datasetLayerContext", () => ({
  getDatasetLayerContextProps: () => ({
    contextLayer: undefined,
    parameters: undefined,
    startDate: undefined,
    endDate: undefined,
  }),
  buildDatasetLayers: () => [],
}));

import { pickDatasetTool } from "../pickDataset";
import { StreamMessage, ChatMessage, SuggestedDataset } from "@/app/types/chat";

type AddMessageFn = (message: Omit<ChatMessage, "id">) => void;

const timestamp = new Date().toISOString();

const suggested: SuggestedDataset[] = [
  { dataset_id: 4, dataset_name: "TCL Fires", reason: "Annual fire series." },
  { dataset_id: 7, dataset_name: "DIST Alerts", reason: "Daily alerts." },
];

const baseMsg = (overrides: Partial<StreamMessage> = {}): StreamMessage => ({
  type: "tool",
  name: "pick_dataset",
  timestamp,
  ...overrides,
});

describe("pickDatasetTool", () => {
  let addMessage: ReturnType<typeof vi.fn<AddMessageFn>>;

  beforeEach(() => {
    addMessage = vi.fn<AddMessageFn>();
  });

  it("emits dataset-nudge with suggested datasets when no direct dataset", () => {
    pickDatasetTool(baseMsg({ suggested_datasets: suggested }), addMessage);

    expect(addMessage).toHaveBeenCalledOnce();
    const msg = addMessage.mock.calls[0][0];
    expect(msg.type).toBe("dataset-nudge");
    expect(
      (msg as { suggestedDatasets: SuggestedDataset[] }).suggestedDatasets
    ).toEqual(suggested);
  });

  it("emits dataset-card widget when dataset has tile_url", () => {
    pickDatasetTool(
      baseMsg({
        dataset: {
          dataset_id: 4,
          dataset_name: "TCL Fires",
          tile_url: "https://example.com/tiles",
        },
      }),
      addMessage
    );

    expect(addMessage).toHaveBeenCalledOnce();
    const msg = addMessage.mock.calls[0][0];
    expect(msg.type).toBe("widget");
  });

  it("appends an assistant reason message when dataset includes a reason", () => {
    pickDatasetTool(
      baseMsg({
        dataset: {
          dataset_id: 4,
          dataset_name: "TCL Fires",
          tile_url: "https://example.com/tiles",
          reason: "Best fit for trend questions.",
        },
      }),
      addMessage
    );

    expect(addMessage).toHaveBeenCalledTimes(2);
    const reasonMsg = addMessage.mock.calls[1][0];
    expect(reasonMsg.type).toBe("assistant");
    expect(reasonMsg.message).toBe("Best fit for trend questions.");
  });

  it("prefers dataset over suggested_datasets when both are present", () => {
    pickDatasetTool(
      baseMsg({
        dataset: {
          dataset_id: 4,
          dataset_name: "TCL Fires",
          tile_url: "https://example.com/tiles",
        },
        suggested_datasets: suggested,
      }),
      addMessage
    );

    const types = addMessage.mock.calls.map((c) => c[0].type);
    expect(types).not.toContain("dataset-nudge");
    expect(types).toContain("widget");
  });

  it("does nothing when neither dataset nor suggested_datasets are present", () => {
    pickDatasetTool(baseMsg(), addMessage);
    expect(addMessage).not.toHaveBeenCalled();
  });
});
