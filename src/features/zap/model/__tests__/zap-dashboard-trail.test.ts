import { describe, expect, it } from "vitest";

import type { ZapDashboardStep, ZapPlan } from "../zap-plan";
import {
  hasDestructiveStep,
  previewDecisions,
  previewQuestion,
} from "../zap-preview";
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
    before: { page: "dashboard", dashboard_id: "d1" },
    state: { page: "dashboard", dashboard_id: "d1" },
    stepStatus: steps.map(() => "done"),
    outcome: "done",
    error: null,
    warnings: [],
    edited: { widget_ids: ["w1"], section_ids: [] },
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
      { rows: [row("one", { edited: added })], index: 0 },
      storage
    );

    expect(loadDashboardTrail("d1", storage).rows[0].edited).toEqual(added);
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
      "Added: Tree cover loss chart; Added: Tree cover loss and its drivers"
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
    ).toBe("Waiting for confirmation: Add chart: Tree cover loss");
    expect(editSummary(row("a", { outcome: "cancelled" }))).toBe(
      "Cancelled. No change"
    );
  });
});

const D = "d1";

const EDITS: Record<string, ZapDashboardStep> = {
  section: {
    kind: "add_section",
    title: 'Add section: "Fire season"',
    detail: "an empty section",
    args: { dashboard_id: D, section: { title: "Fire season" } },
  },
  move: {
    kind: "move",
    title: 'Move: Map "Tree cover loss"',
    detail: 'to section "Drivers"',
    args: {
      dashboard_id: D,
      widget_id: "w1",
      widget_label: 'Map "Tree cover loss" at the top level',
      destination_label: 'section "Drivers"',
      patch: { section_id: "s1" },
    },
  },
  resize: {
    kind: "resize",
    title: 'Resize: Chart "Tree cover loss by driver"',
    detail: "full width (was half width)",
    args: {
      dashboard_id: D,
      widget_id: "w2",
      widget_label: 'Chart "Tree cover loss by driver"',
      size: "double",
      patch: { config: { size: "double" } },
    },
  },
  rename: {
    kind: "rename",
    title: 'Rename section: "Fires"',
    detail: 'to "Fire season"',
    args: {
      dashboard_id: D,
      target_type: "section",
      section_id: "s1",
      old_title: "Fires",
      title: "Fire season",
      patch: { title: "Fire season" },
    },
  },
  period: {
    kind: "change_period",
    title: 'New period: Chart "Tree cover loss per year"',
    detail: "2015–2020 (was 2001–2025) · replaces the widget",
    args: {
      dashboard_id: D,
      widget_id: "w3",
      widget_label: 'Chart "Tree cover loss per year" in section "Overview"',
      dataset_name: "Tree cover loss",
      replace: true,
      analyze: {
        aois: [
          { source: "gadm", src_id: "BRA.14_1", subtype: "state-province" },
        ],
        dataset_id: 4,
        start_date: "2015-01-01",
        end_date: "2020-12-31",
      },
      widget: {
        widget_type: "insight",
        config: {},
        position: 0,
        section_id: "s0",
      },
    },
  },
  remove: {
    kind: "remove",
    title: 'Remove section: "Fires"',
    detail: "its widgets are removed too",
    args: {
      dashboard_id: D,
      target_type: "section",
      section_id: "s1",
      label: 'Section "Fires" (1 widget)',
      delete_widgets: true,
      widget_labels: ['Chart "Fires" in section "Fires"'],
    },
  },
};

describe("editSummary of the edits", () => {
  it.each([
    ["section", 'Added: section "Fire season"'],
    ["move", 'Moved: Map "Tree cover loss" to section "Drivers"'],
    ["resize", 'Resized: Chart "Tree cover loss by driver" to full width'],
    ["rename", 'Renamed: "Fires" to "Fire season"'],
    ["period", 'Changed period: Chart "Tree cover loss per year" to 2015–2020'],
    ["remove", 'Removed: Section "Fires" (1 widget) and its widgets'],
  ])("records %s in words", (name, text) => {
    expect(editSummary(row("a", {}, [EDITS[name]]))).toBe(text);
  });

  it("names a failed edit", () => {
    const failed = row("a", { outcome: "failed", stepStatus: ["failed"] }, [
      EDITS.period,
    ]);
    expect(editSummary(failed)).toBe(
      'Failed: New period: Chart "Tree cover loss per year".'
    );
  });

  it("names a removal and a new period in plain words while it waits", () => {
    expect(
      editSummary(
        row("a", { outcome: "confirm", stepStatus: ["pending"] }, [
          EDITS.period,
        ])
      )
    ).toBe(
      'Waiting for confirmation: Change period: Chart "Tree cover loss per year" to 2015–2020'
    );
    expect(
      editSummary(
        row("a", { outcome: "confirm", stepStatus: ["pending"] }, [
          EDITS.remove,
        ])
      )
    ).toBe('Waiting for confirmation: Remove: Section "Fires" (1 widget)');
  });

  it("drops a trail of version 1", () => {
    const storage = memoryStorage();
    storage.setItem(
      "gnw:zap-dashboard-trail:d1",
      JSON.stringify({ version: 1, rows: [row("old")] })
    );
    expect(loadDashboardTrail("d1", storage)).toEqual(EMPTY_DASHBOARD_TRAIL);
  });
});

describe("preview", () => {
  const target = {
    question: "Target",
    label: 'Chart "Tree cover loss per year"',
    probability: 0.9,
    key: "target",
    value: "widget:w3",
    clear: true,
    options: [
      {
        label: 'Chart "Tree cover loss by driver"',
        probability: 0.05,
        value: "widget:w4",
      },
    ],
  };
  const plan = (steps: ZapDashboardStep[], decisions = [target]): ZapPlan => ({
    steps,
    decisions: [
      {
        question: "Action",
        label: "remove",
        probability: 0.95,
        clear: true,
        key: "action",
        value: "remove",
        options: [{ label: "move", probability: 0.02, value: "move" }],
      },
      ...decisions,
      {
        question: "Time",
        label: "2015–2020",
        probability: 0.4,
        clear: false,
        source: "clairic",
      },
    ],
    notes: [],
  });

  it("asks the target and each unclear decision with options", () => {
    const asks = previewDecisions(plan([EDITS.remove]));
    expect(asks.map((d) => d.key)).toEqual(["target"]);
    const unsure = previewDecisions(
      plan([EDITS.remove], [{ ...target, key: "size", clear: false }])
    );
    expect(unsure.map((d) => d.key)).toEqual(["size"]);
  });

  it("asks which widget or which item", () => {
    expect(previewQuestion(target, plan([EDITS.period]))).toBe("Which widget?");
    expect(previewQuestion(target, plan([EDITS.remove]))).toBe("Which item?");
  });

  it("marks a removal and a new period as destructive", () => {
    expect(hasDestructiveStep(plan([EDITS.remove]))).toBe(true);
    expect(hasDestructiveStep(plan([EDITS.period]))).toBe(true);
    expect(hasDestructiveStep(plan([EDITS.move, EDITS.section]))).toBe(false);
  });
});
