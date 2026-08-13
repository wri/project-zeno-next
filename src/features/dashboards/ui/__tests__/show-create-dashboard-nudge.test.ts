import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { showCreateDashboardNudge } from "../show-create-dashboard-nudge";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import type { AnalysisSelection } from "@/app/store/selectAnalysisSlice";

const selection: AnalysisSelection = {
  name: "Paraná, Brazil",
  source: "gadm",
  srcId: "BRA.16_1",
  subtype: "state-province",
};
const TCL_ID = 4;

const datasetLayer = (overrides: Partial<Layer> = {}): Layer => ({
  id: `dataset-${TCL_ID}`,
  name: "Tree cover loss",
  type: "raster",
  visible: true,
  datasetId: TCL_ID,
  ...overrides,
});

const seedLayers = (layers: Layer[]) => useMapStore.setState({ layers });

const createDashboardNudges = () =>
  useChatStore
    .getState()
    .messages.filter((m) => m.type === "create-dashboard-nudge");

describe("showCreateDashboardNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useMapStore.setState({ layers: [] });
  });

  it("injects a nudge carrying the AOI identity and analysis inputs", () => {
    seedLayers([datasetLayer()]);

    expect(showCreateDashboardNudge(selection)).toBe(true);

    const nudges = createDashboardNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].createDashboardSuggestion).toEqual({
      areaName: "Paraná, Brazil",
      source: "gadm",
      srcId: "BRA.16_1",
      subtype: "state-province",
      datasetId: TCL_ID,
      datasetName: "Tree cover loss",
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  });

  it("keeps a single nudge: a new selection replaces the previous one", () => {
    seedLayers([datasetLayer()]);

    showCreateDashboardNudge(selection);
    showCreateDashboardNudge({
      ...selection,
      name: "Acre, Brazil",
      srcId: "BRA.1_1",
    });

    const nudges = createDashboardNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].createDashboardSuggestion?.areaName).toBe("Acre, Brazil");
  });

  it("is idempotent for the same area and dataset", () => {
    seedLayers([datasetLayer()]);

    showCreateDashboardNudge(selection);
    const id = createDashboardNudges()[0].id;
    expect(showCreateDashboardNudge(selection)).toBe(true);
    expect(createDashboardNudges()[0].id).toBe(id);
  });

  it("re-offers when the dataset changes under the same area", () => {
    seedLayers([datasetLayer()]);
    showCreateDashboardNudge(selection);
    const id = createDashboardNudges()[0].id;

    seedLayers([datasetLayer({ id: "dataset-1", datasetId: 1 })]);
    showCreateDashboardNudge(selection);

    const nudges = createDashboardNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].id).not.toBe(id);
    expect(nudges[0].createDashboardSuggestion?.datasetId).toBe(1);
  });

  it("re-offers when the pinned date range changes under the same area", () => {
    seedLayers([datasetLayer()]);
    showCreateDashboardNudge(selection);
    const id = createDashboardNudges()[0].id;

    useChatStore.getState().setDateRange({
      start: new Date(2020, 2, 1),
      end: new Date(2021, 3, 2),
    });
    showCreateDashboardNudge(selection);

    // A stale payload here would seed the analysis for the previous window.
    const nudges = createDashboardNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].id).not.toBe(id);
    expect(nudges[0].createDashboardSuggestion?.startDate).toBe("2020-03-01");
    expect(nudges[0].createDashboardSuggestion?.endDate).toBe("2021-04-02");
  });

  it("uses the pinned date range when the user set one", () => {
    seedLayers([datasetLayer()]);
    // Local-time constructors: date-fns `format` renders in local time, so a
    // UTC literal would shift a day in any negative-offset zone.
    useChatStore.getState().setDateRange({
      start: new Date(2020, 2, 1),
      end: new Date(2021, 3, 2),
    });

    showCreateDashboardNudge(selection);

    const suggestion = createDashboardNudges()[0].createDashboardSuggestion;
    expect(suggestion?.startDate).toBe("2020-03-01");
    expect(suggestion?.endDate).toBe("2021-04-02");
  });

  it("does nothing without an active dataset", () => {
    expect(showCreateDashboardNudge(selection)).toBe(false);
    expect(createDashboardNudges()).toHaveLength(0);
  });

  it("ignores a context sub-layer as the active dataset", () => {
    seedLayers([datasetLayer({ parentLayerId: "dataset-9" })]);

    expect(showCreateDashboardNudge(selection)).toBe(false);
    expect(createDashboardNudges()).toHaveLength(0);
  });

  it("does nothing for an empty area name", () => {
    seedLayers([datasetLayer()]);
    expect(showCreateDashboardNudge({ ...selection, name: "" })).toBe(false);
    expect(createDashboardNudges()).toHaveLength(0);
  });

  it("does nothing when the selection carries no src id", () => {
    seedLayers([datasetLayer()]);
    expect(showCreateDashboardNudge({ ...selection, srcId: undefined })).toBe(
      false
    );
    expect(createDashboardNudges()).toHaveLength(0);
  });

  it("does nothing when the selection carries no subtype", () => {
    seedLayers([datasetLayer()]);
    expect(showCreateDashboardNudge({ ...selection, subtype: undefined })).toBe(
      false
    );
    expect(createDashboardNudges()).toHaveLength(0);
  });
});
