import type {
  ZapCurrent,
  ZapMapView,
  ZapPlan,
  ZapStepStatus,
} from "./zap-plan";

/** The trail keeps the last rows only. A new row drops the oldest row. */
export const TRAIL_LIMIT = 20;

/** One request in the trail: the prompt, its plan and the map after it. */
export interface ZapRow {
  id: string;
  prompt: string;
  plan: ZapPlan;
  /** The map state after the plan. The next request sends it again. */
  state: ZapCurrent;
  stepStatus: ZapStepStatus[];
  /** What puts the map back in `state`. */
  view: ZapMapView;
}

/**
 * The trail of map states. `index` is the selected row; -1 is the map
 * before the first row, which `base` holds.
 */
export interface ZapTrail {
  base: ZapMapView | null;
  rows: ZapRow[];
  index: number;
}

export const EMPTY_TRAIL: ZapTrail = { base: null, rows: [], index: -1 };

const TRAIL_KEY = "gnw:zap-trail";
const TRAIL_VERSION = 1;

/** Session storage, or null when the browser does not give it. */
function sessionStore(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Reads the trail. Returns an empty trail when the stored value is bad. */
export function loadTrail(storage = sessionStore()): ZapTrail {
  try {
    const raw = storage?.getItem(TRAIL_KEY);
    if (!raw) return EMPTY_TRAIL;
    const stored = JSON.parse(raw) as Partial<ZapTrail> & { version?: number };
    if (stored.version !== TRAIL_VERSION || !Array.isArray(stored.rows)) {
      return EMPTY_TRAIL;
    }
    const rows = stored.rows.slice(-TRAIL_LIMIT);
    const index =
      typeof stored.index === "number" &&
      Number.isInteger(stored.index) &&
      stored.index >= -1 &&
      stored.index < rows.length
        ? stored.index
        : rows.length - 1;
    return { base: stored.base ?? null, rows, index };
  } catch {
    return EMPTY_TRAIL;
  }
}

/** Writes the trail. Does nothing when storage is not available or full. */
export function saveTrail(trail: ZapTrail, storage = sessionStore()): void {
  try {
    if (trail.rows.length === 0) {
      storage?.removeItem(TRAIL_KEY);
      return;
    }
    const { base, rows, index } = trail;
    storage?.setItem(
      TRAIL_KEY,
      JSON.stringify({ version: TRAIL_VERSION, base, rows, index })
    );
  } catch {
    // The trail stays in memory only.
  }
}

/**
 * Adds a row after the selected row. The rows after the selected row are
 * removed, as in browser history. `before` is the map before the request;
 * it becomes the base when the new row is the first row. When the trail is
 * full, the oldest row is removed and its map becomes the base.
 */
export function addRow(
  trail: ZapTrail,
  row: ZapRow,
  before: ZapMapView
): ZapTrail {
  const kept = trail.rows.slice(0, trail.index + 1);
  let base = kept.length === 0 ? before : trail.base;
  const all = [...kept, row];
  const dropped = all.slice(0, -TRAIL_LIMIT);
  if (dropped.length > 0) base = dropped[dropped.length - 1].view;
  const rows = all.slice(-TRAIL_LIMIT);
  return { base, rows, index: rows.length - 1 };
}
