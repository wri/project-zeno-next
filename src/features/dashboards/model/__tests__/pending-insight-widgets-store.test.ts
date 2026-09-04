import { beforeEach, describe, expect, it } from "vitest";

import {
  PENDING_INSIGHT_WIDGET_MAX_AGE_MS,
  pendingInsightWidgetKey,
  pendingInsightWidgetsFor,
  usePendingInsightWidgetsStore,
} from "../pending-insight-widgets-store";

const tcl = {
  dashboardId: "d1",
  datasetId: 4,
  title: "Tree cover loss in Pará",
  datasetName: "Tree cover loss",
  chartCountHint: 2,
};

const gain = {
  dashboardId: "d1",
  datasetId: 5,
  title: "Tree cover gain in Pará",
  datasetName: "Tree cover gain",
  chartCountHint: 1,
};

const store = () => usePendingInsightWidgetsStore.getState();

describe("pendingInsightWidgetsStore", () => {
  beforeEach(() => {
    store().reset();
  });

  it("begin adds an entry keyed on dashboard + dataset and returns the key", () => {
    const key = store().begin({ ...tcl, startedAt: 1_000 });
    expect(key).toBe(pendingInsightWidgetKey("d1", 4));
    expect(store().entries).toEqual([
      { ...tcl, key: "d1:4", startedAt: 1_000 },
    ]);
  });

  it("keeps entries in the order they began", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().begin({ ...gain, startedAt: 2_000 });
    expect(store().entries.map((e) => e.datasetId)).toEqual([4, 5]);
  });

  it("begin on an existing key replaces the entry rather than duplicating it", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().attachInsightId("d1:4", "ins-old");
    store().begin({ ...tcl, startedAt: 5_000 });
    expect(store().entries).toHaveLength(1);
    expect(store().entries[0]).toMatchObject({
      key: "d1:4",
      startedAt: 5_000,
    });
    // A restart is a fresh run: the old insight id must not linger.
    expect(store().entries[0].insightId).toBeUndefined();
  });

  it("attachInsightId records the persisted id on the right entry only", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().begin({ ...gain, startedAt: 1_000 });
    store().attachInsightId("d1:4", "ins-1");
    expect(store().entries.find((e) => e.key === "d1:4")?.insightId).toBe(
      "ins-1"
    );
    expect(
      store().entries.find((e) => e.key === "d1:5")?.insightId
    ).toBeUndefined();
  });

  it("clear removes one entry; clearing an unknown key is a no-op", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().begin({ ...gain, startedAt: 1_000 });
    store().clear("d1:4");
    expect(store().entries.map((e) => e.key)).toEqual(["d1:5"]);
    store().clear("nope");
    expect(store().entries.map((e) => e.key)).toEqual(["d1:5"]);
  });

  it("clearForDashboard removes only that dashboard's entries", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().begin({ ...gain, dashboardId: "d2", startedAt: 1_000 });
    store().clearForDashboard("d1");
    expect(store().entries.map((e) => e.key)).toEqual(["d2:5"]);
  });

  it("defaults startedAt to now", () => {
    const before = Date.now();
    store().begin(tcl);
    expect(store().entries[0].startedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("pendingInsightWidgetsFor", () => {
  beforeEach(() => {
    store().reset();
  });

  it("selects one dashboard's entries in order", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().begin({ ...gain, dashboardId: "d2", startedAt: 1_000 });
    store().begin({ ...gain, startedAt: 2_000 });
    const forD1 = pendingInsightWidgetsFor(store().entries, "d1", 3_000);
    expect(forD1.map((e) => e.key)).toEqual(["d1:4", "d1:5"]);
  });

  it("drops entries past the age valve", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    store().begin({ ...gain, startedAt: 50_000 });
    const now = 1_000 + PENDING_INSIGHT_WIDGET_MAX_AGE_MS;
    expect(
      pendingInsightWidgetsFor(store().entries, "d1", now).map((e) => e.key)
    ).toEqual(["d1:5"]);
  });

  it("returns [] for a dashboard with nothing pending", () => {
    store().begin({ ...tcl, startedAt: 1_000 });
    expect(pendingInsightWidgetsFor(store().entries, "d9", 2_000)).toEqual([]);
  });
});
