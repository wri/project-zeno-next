import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { runAnalysis } from "../runAnalysis";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";

const suggestion = {
  areaName: "Pará, Brazil",
  datasetId: 4,
  datasetName: "Tree cover loss",
};

describe("runAnalysis", () => {
  const originalSendMessage = useChatStore.getState().sendMessage;
  const sendMessage = vi.fn().mockResolvedValue({ isNew: true, id: "t-1" });

  beforeEach(() => {
    sendMessage.mockClear();
    useChatStore.setState({ sendMessage });
    useMapStore
      .getState()
      .setAnalysis({ name: "Pará, Brazil", source: "gadm" });
  });

  afterEach(() => {
    useChatStore.setState({ sendMessage: originalSendMessage });
    useMapStore.getState().clearAnalysis();
  });

  it("sends the structured prompt through the generative pipeline", () => {
    runAnalysis(suggestion);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      "Analyse Tree cover loss in Pará, Brazil.",
      "query"
    );
  });

  it("clears the analysis selection once the analysis is triggered", () => {
    runAnalysis(suggestion);
    expect(useMapStore.getState().analysisSelection).toBeNull();
  });
});
