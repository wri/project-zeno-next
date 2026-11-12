import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stateAfter, type ZapMapView, type ZapPlan } from "../zap-plan";
import useZapStore from "../zap-store";
import { TRAIL_LIMIT, loadTrail, saveTrail, type ZapRow } from "../zap-trail";

const KEY = "gnw:zap-trail";

/** A session storage in memory. */
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

const view = (name: string): ZapMapView => ({
  layers: [{ id: `dataset-${name}` }],
  areas: [],
});

const EMPTY_PLAN: ZapPlan = { steps: [], decisions: [], notes: [] };

function row(prompt: string): Omit<ZapRow, "stepStatus"> {
  return {
    id: prompt,
    prompt,
    plan: EMPTY_PLAN,
    state: { dataset_id: 4 },
    view: view(prompt),
  };
}

/** Adds rows as the runner does: each row starts from the view before it. */
function addRows(...prompts: string[]) {
  for (const prompt of prompts) {
    const { rows, index, addRow } = useZapStore.getState();
    addRow(row(prompt), index >= 0 ? rows[index].view : view("start"));
  }
}

const prompts = () => useZapStore.getState().rows.map((r) => r.prompt);

describe("zap trail store", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal("sessionStorage", storage);
    useZapStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds a row after the selected row and selects it", () => {
    addRows("deforestation in Pará", "since 2015");

    const state = useZapStore.getState();
    expect(prompts()).toEqual(["deforestation in Pará", "since 2015"]);
    expect(state.index).toBe(1);
    expect(state.base).toEqual(view("start"));
    expect(state.rows[1].stepStatus).toEqual([]);
  });

  it("keeps the last 20 rows and makes the map of the dropped row the base", () => {
    const all = Array.from({ length: TRAIL_LIMIT + 1 }, (_, i) => `p${i}`);
    addRows(...all);

    const state = useZapStore.getState();
    expect(state.rows).toHaveLength(TRAIL_LIMIT);
    expect(prompts()[0]).toBe("p1");
    expect(state.index).toBe(TRAIL_LIMIT - 1);
    // Undo from the first row goes to the map after the dropped row.
    expect(state.base).toEqual(view("p0"));
  });

  it("removes the later rows when a request starts from an older row", () => {
    addRows("a", "b", "c");
    useZapStore.getState().select(0);

    addRows("d");

    expect(prompts()).toEqual(["a", "d"]);
    expect(useZapStore.getState().index).toBe(1);
  });

  it("makes a new base when a request starts from the map before zap", () => {
    addRows("a", "b");
    useZapStore.getState().select(-1);

    useZapStore.getState().addRow(row("c"), view("changed"));

    expect(prompts()).toEqual(["c"]);
    expect(useZapStore.getState().base).toEqual(view("changed"));
  });

  it("selects rows back and forward within the trail only", () => {
    addRows("a", "b");
    const { select } = useZapStore.getState();

    select(0);
    expect(useZapStore.getState().index).toBe(0);
    select(-1);
    expect(useZapStore.getState().index).toBe(-1);
    select(-2);
    expect(useZapStore.getState().index).toBe(-1);
    select(1);
    select(2);
    expect(useZapStore.getState().index).toBe(1);
  });

  it("writes the trail to session storage and restores it", () => {
    addRows("a", "b");
    useZapStore.getState().select(0);

    const stored = JSON.parse(storage.getItem(KEY) ?? "{}");
    expect(stored).toMatchObject({ version: 1, index: 0 });
    expect(stored.rows).toHaveLength(2);

    useZapStore.setState({ rows: [], index: -1, base: null });
    // setState above wrote the empty trail; write the old one again.
    storage.setItem(KEY, JSON.stringify(stored));
    useZapStore.getState().restore();

    const state = useZapStore.getState();
    expect(prompts()).toEqual(["a", "b"]);
    expect(state.index).toBe(0);
    expect(state.base).toEqual(view("start"));
  });

  it("removes the stored trail on reset", () => {
    addRows("a");
    useZapStore.getState().reset();

    expect(storage.getItem(KEY)).toBeNull();
  });

  it("ignores a stored trail that is not valid", () => {
    storage.setItem(KEY, "{not json");
    expect(loadTrail(storage).rows).toEqual([]);

    storage.setItem(KEY, JSON.stringify({ version: 99, rows: [] }));
    expect(loadTrail(storage).rows).toEqual([]);

    storage.setItem(
      KEY,
      JSON.stringify({ version: 1, rows: [row("a")], index: 7, base: null })
    );
    expect(loadTrail(storage).index).toBe(0);
  });

  it("works with no storage", () => {
    vi.stubGlobal("sessionStorage", brokenStorage);

    expect(() => addRows("a", "b")).not.toThrow();
    expect(prompts()).toEqual(["a", "b"]);
    expect(loadTrail(brokenStorage).rows).toEqual([]);
    expect(() =>
      saveTrail(useZapStore.getState(), brokenStorage)
    ).not.toThrow();

    vi.stubGlobal("sessionStorage", undefined);
    expect(loadTrail().rows).toEqual([]);
    expect(() => useZapStore.getState().restore()).not.toThrow();
  });
});

describe("stateAfter", () => {
  const AREA = { name: "Pará, Brazil", source: "gadm", src_id: "BRA.14_1" };

  it("uses the state that the backend sends", () => {
    const state = {
      dataset_id: 4,
      area: AREA,
      context_layer: "primary_forest",
    };
    expect(stateAfter({}, { ...EMPTY_PLAN, state })).toBe(state);
  });

  it("makes the state from the steps when the backend sends none", () => {
    const plan: ZapPlan = {
      ...EMPTY_PLAN,
      steps: [
        {
          kind: "dataset",
          title: "Show Tree cover loss",
          detail: "",
          args: {
            dataset_id: 4,
            dataset_name: "Tree cover loss",
            tile_url: "",
            start_date: "2015-01-01",
            end_date: "2025-12-31",
            context_layer: "primary_forest",
            parameters: [{ name: "canopy_cover", values: [50] }],
          },
        },
        { kind: "area", title: "Go to Pará", detail: "", args: AREA },
      ],
    };

    expect(stateAfter({ dataset_id: 1, canopy_cover: 30 }, plan)).toEqual({
      dataset_id: 4,
      area: AREA,
      start_date: "2015-01-01",
      end_date: "2025-12-31",
      context_layer: "primary_forest",
      canopy_cover: 50,
    });
  });

  it("keeps the current state when the plan has no steps", () => {
    const current = { dataset_id: 4, area: AREA, start_date: "2020-01-01" };
    expect(stateAfter(current, EMPTY_PLAN)).toEqual(current);
  });
});
