import { describe, it, expect, beforeEach, vi } from "vitest";

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { showViewAnalysisNudge } from "../show-view-analysis-nudge";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import type { ContextItem } from "@/app/store/contextStore";
import type { AreaSelection } from "../../model/area-selection";

const selection: AreaSelection = {
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

const dateContext = (start: Date, end: Date): ContextItem => ({
  id: "date-1",
  contextType: "date",
  content: "",
  dateRange: { start, end },
});

// Seed context state directly: addContext has map-layer side effects that are
// irrelevant to nudge gating.
const seedContext = (items: ContextItem[]) =>
  useContextStore.setState({ context: items });

const viewNudges = () =>
  useChatStore
    .getState()
    .messages.filter((m) => m.type === "view-analysis-nudge");

describe("showViewAnalysisNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useContextStore.getState().reset();
  });

  it("injects a view-analysis-nudge when a dataset is active", () => {
    seedContext([layerContext()]);

    expect(showViewAnalysisNudge(selection)).toBe(true);

    const nudges = viewNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].viewAnalysisSuggestion).toMatchObject({
      area: selection,
      datasetId: TCL_ID,
      datasetName: "Tree cover loss",
    });
  });

  it("falls back to the default date window when no date context is set", () => {
    seedContext([layerContext()]);

    showViewAnalysisNudge(selection);

    expect(viewNudges()[0].viewAnalysisSuggestion).toMatchObject({
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  });

  it("uses the date range from context when present", () => {
    // Construct local-time dates (month is 0-indexed) so date-fns `format`
    // doesn't shift a UTC-parsed midnight across the day boundary.
    seedContext([
      layerContext(),
      dateContext(new Date(2015, 5, 1), new Date(2020, 8, 30)),
    ]);

    showViewAnalysisNudge(selection);

    expect(viewNudges()[0].viewAnalysisSuggestion).toMatchObject({
      startDate: "2015-06-01",
      endDate: "2020-09-30",
    });
  });

  it("appends the nudge as the last message", () => {
    seedContext([layerContext()]);
    useChatStore
      .getState()
      .addMessage({ type: "assistant", message: "Some narrative" });

    showViewAnalysisNudge(selection);

    expect(useChatStore.getState().messages.at(-1)?.type).toBe(
      "view-analysis-nudge"
    );
  });

  it("keeps a single live nudge: a new selection replaces the previous one", () => {
    seedContext([layerContext()]);

    showViewAnalysisNudge(selection);
    showViewAnalysisNudge({ name: "Acre, Brazil", source: "gadm" });

    const nudges = viewNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].viewAnalysisSuggestion?.area.name).toBe("Acre, Brazil");
  });

  it("is idempotent for an identical pending nudge (reactive trigger re-runs)", () => {
    seedContext([layerContext()]);

    showViewAnalysisNudge(selection);
    const firstId = viewNudges()[0].id;

    expect(showViewAnalysisNudge(selection)).toBe(true);

    const nudges = viewNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].id).toBe(firstId);
  });

  it("does nothing when no dataset is active (analysis stays gated)", () => {
    expect(showViewAnalysisNudge(selection)).toBe(false);
    expect(viewNudges()).toHaveLength(0);
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

    expect(showViewAnalysisNudge(selection)).toBe(false);
  });

  it("does nothing for a selection without a name", () => {
    seedContext([layerContext()]);
    expect(showViewAnalysisNudge({ name: "", source: "gadm" })).toBe(false);
    expect(viewNudges()).toHaveLength(0);
  });

  it("falls back to the layer display name for datasets outside the catalogue", () => {
    seedContext([
      layerContext({ datasetId: 99999, layerName: "Custom layer" }),
    ]);

    expect(showViewAnalysisNudge(selection)).toBe(true);
    expect(viewNudges()[0].viewAnalysisSuggestion?.datasetName).toBe(
      "Custom layer"
    );
  });
});
