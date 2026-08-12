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
import { StreamMessage, ChatMessage } from "@/app/types/chat";

type AddMessageFn = (message: Omit<ChatMessage, "id">) => void;

const timestamp = new Date().toISOString();

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

  it("does nothing when no resolved dataset is present", () => {
    // A pick_dataset turn that instead asks the user to choose carries a
    // nudge, which processStreamMessage buffers generically — the tool
    // handler itself only deals with resolved datasets.
    pickDatasetTool(
      baseMsg({
        nudge: {
          type: "dataset_choice",
          options: ["TCL Fires", "DIST Alerts"],
        },
      }),
      addMessage
    );
    expect(addMessage).not.toHaveBeenCalled();
  });
});
