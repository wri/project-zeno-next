import { describe, it, expect, beforeEach, vi } from "vitest";

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { showAnalysisCta } from "../showAnalysisCta";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import type { ContextItem } from "@/app/store/contextStore";
import type { AnalysisSelection } from "@/app/store/selectAnalysisSlice";

const selection: AnalysisSelection = {
  name: "Pará, Brazil",
  source: "gadm",
  srcId: "BRA.14_1",
  subtype: "adm1",
};

// Tree cover loss in the dataset catalogue (DATASET_BY_ID)
const TCL_ID = 4;

const layerContext = (overrides: Partial<ContextItem> = {}): ContextItem => ({
  id: "layer-1",
  contextType: "layer",
  content: "Tree cover loss",
  datasetId: TCL_ID,
  ...overrides,
});

// Seed context state directly: addContext has map-layer side effects that are
// irrelevant to CTA gating.
const seedContext = (items: ContextItem[]) =>
  useContextStore.setState({ context: items });

const analyseNudges = () =>
  useChatStore.getState().messages.filter((m) => m.type === "analyse-nudge");

describe("showAnalysisCta", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useContextStore.getState().reset();
  });

  it("injects an analyse-nudge when a dataset is active", () => {
    seedContext([layerContext()]);

    expect(showAnalysisCta(selection)).toBe(true);

    const nudges = analyseNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].analyseSuggestion).toEqual({
      areaName: "Pará, Brazil",
      datasetId: TCL_ID,
      datasetName: "Tree cover loss",
    });
  });

  it("appends the nudge as the last message", () => {
    seedContext([layerContext()]);
    useChatStore
      .getState()
      .addMessage({ type: "assistant", message: "Some narrative" });

    showAnalysisCta(selection);

    expect(useChatStore.getState().messages.at(-1)?.type).toBe("analyse-nudge");
  });

  it("keeps a single live nudge: a new selection replaces the previous one", () => {
    seedContext([layerContext()]);

    showAnalysisCta(selection);
    showAnalysisCta({ name: "Acre, Brazil", source: "gadm" });

    const nudges = analyseNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].analyseSuggestion?.areaName).toBe("Acre, Brazil");
  });

  it("does nothing when no dataset is active (analysis stays gated)", () => {
    expect(showAnalysisCta(selection)).toBe(false);
    expect(analyseNudges()).toHaveLength(0);
  });

  it("ignores non-layer context when looking for an active dataset", () => {
    seedContext([
      {
        id: "area-1",
        contextType: "area",
        content: "Pará, Brazil",
        aoiData: { name: "Pará, Brazil" },
      },
    ]);

    expect(showAnalysisCta(selection)).toBe(false);
  });

  it("does nothing for a selection without a name", () => {
    seedContext([layerContext()]);
    expect(showAnalysisCta({ name: "", source: "gadm" })).toBe(false);
    expect(analyseNudges()).toHaveLength(0);
  });

  it("falls back to the layer display name for datasets outside the catalogue", () => {
    seedContext([
      layerContext({ datasetId: 99999, layerName: "Custom layer" }),
    ]);

    expect(showAnalysisCta(selection)).toBe(true);
    expect(analyseNudges()[0].analyseSuggestion?.datasetName).toBe(
      "Custom layer"
    );
  });
});
