import { beforeEach, describe, expect, it } from "vitest";

import type { Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import useInsightStore from "@/app/store/insightStore";

import { EMPTY_PROGRESS } from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import type { Tour } from "../../model/tour";
import { FIRST_RUN_TOUR_ID } from "../../model/tour-entry";
import { createChecklistWatcher } from "../use-checklist-detection";

const imagery = (id: string): Layer => ({
  id,
  name: id,
  type: "raster",
  visible: true,
  imagery: { tile_url: "x", mosaic_id: id, aoi_names: ["Mau"] },
});
const protectedArea = (id: string): Layer => ({
  id,
  name: id,
  type: "geojson",
  visible: true,
  featureRefs: [{ name: id, source: "wdpa", srcId: id }],
});

const tour = (id: string): Tour<unknown> => ({
  id,
  version: 1,
  steps: [{ id: "a", title: "a", body: null }],
});
const done = () => useOnboardingStore.getState().progress.checklistDone;
const setLayers = (...layers: Layer[]) => useMapStore.setState({ layers });

beforeEach(() => {
  useMapStore.getState().reset();
  useInsightStore.getState().clearInsights();
  useOnboardingStore.setState({
    tour: null,
    progress: EMPTY_PROGRESS,
    hydrated: true,
    lastTickedBy: null,
  });
});

describe("the checklist watcher", () => {
  it("ticks a task the user did, as detected", () => {
    const check = createChecklistWatcher();
    setLayers(imagery("m1"));
    check();
    expect(done()).toEqual(["satellite-imagery"]);
    expect(useOnboardingStore.getState().lastTickedBy).toBe("detected");
  });

  it("ticks nothing while the first-run tour runs", () => {
    const check = createChecklistWatcher();
    useOnboardingStore.setState({ tour: tour(FIRST_RUN_TOUR_ID) });
    setLayers(imagery("m1"), protectedArea("Serengeti"));
    check();
    expect(done()).toEqual([]);
  });

  it("doesn't count what the first-run tour left on the map, after it ends", () => {
    const check = createChecklistWatcher();
    useOnboardingStore.setState({ tour: tour(FIRST_RUN_TOUR_ID) });
    setLayers(protectedArea("Serengeti"));
    check();
    useOnboardingStore.setState({ tour: null });
    check();
    expect(done()).toEqual([]);

    // A new protected area, picked after the tour, is the user's own.
    setLayers(protectedArea("Tsavo"));
    check();
    expect(done()).toEqual(["protected-area"]);
  });

  it("ticks while a checklist guide runs: the user is doing the task", () => {
    const check = createChecklistWatcher();
    useOnboardingStore.setState({ tour: tour("checklist-satellite-imagery") });
    setLayers(imagery("m1"));
    check();
    expect(done()).toEqual(["satellite-imagery"]);
  });

  it("waits for stored progress before ticking", () => {
    const check = createChecklistWatcher();
    useOnboardingStore.setState({ hydrated: false });
    setLayers(imagery("m1"));
    check();
    expect(done()).toEqual([]);
  });

  it("never ticks the PDF task, which the app can't see", () => {
    const check = createChecklistWatcher();
    check();
    expect(done()).not.toContain("dashboard-pdf");
  });
});
