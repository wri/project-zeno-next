import { describe, expect, it } from "vitest";

import type { ZapDashboardStep, ZapPlan } from "../zap-plan";
import {
  addDashboardRow,
  editSummary,
  EMPTY_DASHBOARD_TRAIL,
  loadDashboardTrail,
  saveDashboardTrail,
  type ZapDashboardRow,
} from "../zap-dashboard-trail";
import { loadTrail, saveTrail, TRAIL_LIMIT } from "../zap-trail";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (k) => items.get(k) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (k) => void items.delete(k),
    setItem: (k, v) => void items.set(k, v),
  };
}

/** A storage that throws on each call, as in a private window. */
const brokenStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
} as unknown as Storage;

const CHART: ZapDashboardStep = {
  kind: "add_chart",
  title: "Add chart: Tree cover loss",
  detail: "2015–2025",
  args: {
    dashboard_id: "d1",
    dataset_name: "Tree cover loss",
    analyze: {
      aois: [{ source: "gadm", src_id: "BRA.14_1", subtype: "state-province" }],
      dataset_id: 4,
      start_date: "2015-01-01",
      end_date: "2025-12-31",
    },
    widget: { widget_type: "insight", config: {} },
  },
};

const TEMPLATE: ZapDashboardStep = {
  kind: "add_template",
  title: "Add section: Tree cover loss and its drivers",
  detail: "",
  args: { dashboard_id: "d1", template: "forest-loss-drivers", args: {} },
};

function row(
  prompt: string,
  change: Partial<ZapDashboardRow> = {},
  steps: ZapDashboardStep[] = [CHART]
): ZapDashboardRow {
  const plan: ZapPlan = { steps, decisions: [], notes: [] };
  return {
    id: prompt,
    prompt,
    plan,
    state: { page: "dashboard", dashboard_id: "d1" },
    stepStatus: steps.map(() => "done"),
    outcome: "done",
    error: null,
    warnings: [],
    added: { widget_ids: ["w1"], section_ids: [] },
    ...change,
  };
}

describe("dashboard trail storage", () => {
  it("keeps one trail for each dashboard, apart from the map trail", () => {
    const storage = memoryStorage();
    saveDashboardTrail("d1", { rows: [row("one")], index: 0 }, storage);
    saveDashboardTrail(
      "d2",
      { rows: [row("two"), row("three")], index: 1 },
      storage
    );
    saveTrail({ base: null, rows: [{ id: "m" } as never], index: 0 }, storage);

    expect(loadDashboardTrail("d1", storage).rows.map((r) => r.prompt)).toEqual(
      ["one"]
    );
    expect(loadDashboardTrail("d2", storage).rows).toHaveLength(2);
    expect(loadTrail(storage).rows).toHaveLength(1);

    saveDashboardTrail("d1", EMPTY_DASHBOARD_TRAIL, storage);
    expect(loadDashboardTrail("d1", storage)).toEqual(EMPTY_DASHBOARD_TRAIL);
    expect(loadDashboardTrail("d2", storage).rows).toHaveLength(2);
    expect(loadTrail(storage).rows).toHaveLength(1);
  });

  it("keeps the ids of what each row added", () => {
    const storage = memoryStorage();
    const added = { widget_ids: ["w1", "w2"], section_ids: ["s1"] };
    saveDashboardTrail(
      "d1",
      { rows: [row("one", { added })], index: 0 },
      storage
    );

    expect(loadDashboardTrail("d1", storage).rows[0].added).toEqual(added);
  });

  it(`keeps the last ${TRAIL_LIMIT} rows`, () => {
    let trail = EMPTY_DASHBOARD_TRAIL;
    for (let i = 0; i < TRAIL_LIMIT + 3; i++) {
      trail = addDashboardRow(trail, row(`p${i}`));
    }

    expect(trail.rows).toHaveLength(TRAIL_LIMIT);
    expect(trail.rows[0].prompt).toBe("p3");
    expect(trail.index).toBe(TRAIL_LIMIT - 1);
  });

  it("works in memory when storage is not available", () => {
    expect(() =>
      saveDashboardTrail("d1", { rows: [row("one")], index: 0 }, brokenStorage)
    ).not.toThrow();
    expect(loadDashboardTrail("d1", brokenStorage)).toEqual(
      EMPTY_DASHBOARD_TRAIL
    );
    expect(loadDashboardTrail("d1", null)).toEqual(EMPTY_DASHBOARD_TRAIL);
  });

  it("ignores a stored value that is not a trail", () => {
    const storage = memoryStorage();
    storage.setItem("gnw:zap-dashboard-trail:d1", "{not json");
    expect(loadDashboardTrail("d1", storage)).toEqual(EMPTY_DASHBOARD_TRAIL);
    storage.setItem(
      "gnw:zap-dashboard-trail:d1",
      JSON.stringify({ version: 9, rows: [] })
    );
    expect(loadDashboardTrail("d1", storage)).toEqual(EMPTY_DASHBOARD_TRAIL);
  });
});

describe("editSummary", () => {
  it("names the additions", () => {
    expect(editSummary(row("a", {}, [CHART, TEMPLATE]))).toBe(
      "Added: Tree cover loss chart, Tree cover loss and its drivers"
    );
  });

  it("names the failed step and what stayed", () => {
    const failed = row(
      "a",
      { outcome: "failed", stepStatus: ["done", "failed"] },
      [CHART, TEMPLATE]
    );
    expect(editSummary(failed)).toBe(
      "Failed: Add section: Tree cover loss and its drivers. Added: Tree cover loss chart."
    );
  });

  it("gives the note of the planner when nothing changes", () => {
    const none = row("hi", { outcome: "no-change", stepStatus: [] }, []);
    none.plan.notes = ["Zap cannot remove a widget yet."];
    expect(editSummary(none)).toBe(
      "No change: Zap cannot remove a widget yet."
    );
  });

  it("tells a plan that waits or was cancelled", () => {
    expect(
      editSummary(row("a", { outcome: "confirm", stepStatus: ["pending"] }))
    ).toBe("Waiting for confirmation: Tree cover loss chart");
    expect(editSummary(row("a", { outcome: "cancelled" }))).toBe(
      "Cancelled. No change"
    );
  });
});
