import { describe, it, expect, beforeEach, vi } from "vitest";

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { showViewAnalysisNudge } from "../show-view-analysis-nudge";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import type { AreaSelection } from "../../model/area-selection";

const selection: AreaSelection = {
  name: "Pará, Brazil",
  source: "gadm",
  srcId: "BRA.14_1",
  subtype: "adm1",
};

// Tree cover loss in the dataset catalogue (DATASET_BY_ID)
const TCL_ID = 4;

const seedLayer = (datasetId: number, name: string) =>
  useMapStore.setState({
    layers: [{ id: "l1", name, type: "raster", visible: true, datasetId }],
  });

const seedDateRange = (start: Date, end: Date) =>
  useChatStore.setState({ dateRange: { start, end } });

const viewNudges = () =>
  useChatStore
    .getState()
    .messages.filter((m) => m.type === "view-analysis-nudge");

describe("showViewAnalysisNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useMapStore.setState({ layers: [] });
  });

  it("injects a view-analysis-nudge when a dataset is active", () => {
    seedLayer(TCL_ID, "Tree cover loss");

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
    seedLayer(TCL_ID, "Tree cover loss");

    showViewAnalysisNudge(selection);

    expect(viewNudges()[0].viewAnalysisSuggestion).toMatchObject({
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  });

  it("uses the date range from context when present", () => {
    // Construct local-time dates (month is 0-indexed) so date-fns `format`
    // doesn't shift a UTC-parsed midnight across the day boundary.
    seedLayer(TCL_ID, "Tree cover loss");
    seedDateRange(new Date(2015, 5, 1), new Date(2020, 8, 30));

    showViewAnalysisNudge(selection);

    expect(viewNudges()[0].viewAnalysisSuggestion).toMatchObject({
      startDate: "2015-06-01",
      endDate: "2020-09-30",
    });
  });

  it("appends the nudge as the last message", () => {
    seedLayer(TCL_ID, "Tree cover loss");
    useChatStore
      .getState()
      .addMessage({ type: "assistant", message: "Some narrative" });

    showViewAnalysisNudge(selection);

    expect(useChatStore.getState().messages.at(-1)?.type).toBe(
      "view-analysis-nudge"
    );
  });

  it("keeps a single live nudge: a new selection replaces the previous one", () => {
    seedLayer(TCL_ID, "Tree cover loss");

    showViewAnalysisNudge(selection);
    showViewAnalysisNudge({ name: "Acre, Brazil", source: "gadm" });

    const nudges = viewNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].viewAnalysisSuggestion?.area.name).toBe("Acre, Brazil");
  });

  it("is idempotent for an identical pending nudge (reactive trigger re-runs)", () => {
    seedLayer(TCL_ID, "Tree cover loss");

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

  it("does nothing for a selection without a name", () => {
    seedLayer(TCL_ID, "Tree cover loss");
    expect(showViewAnalysisNudge({ name: "", source: "gadm" })).toBe(false);
    expect(viewNudges()).toHaveLength(0);
  });

  it("falls back to the layer display name for datasets outside the catalogue", () => {
    seedLayer(99999, "Custom layer");

    expect(showViewAnalysisNudge(selection)).toBe(true);
    expect(viewNudges()[0].viewAnalysisSuggestion?.datasetName).toBe(
      "Custom layer"
    );
  });
});
