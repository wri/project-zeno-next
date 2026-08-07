/**
 * Remembers which persisted insight a curated analysis template produced on a
 * dashboard, so re-toggling the card re-attaches the existing insight instead
 * of running `/api/analyze` again ("run once, then reuse").
 *
 * Stored client-side in localStorage: the backend has no notion of a "curated
 * run" — the insight it persists is indistinguishable from any other analysis.
 * Losing the mapping (another device, cleared storage) is benign: the next
 * toggle simply runs a fresh analysis.
 */

const STORAGE_KEY = "curated-analysis-insights";

/** A completed curated run: the persisted insight plus the widget config
 *  (per-chart title overrides) to POST when re-attaching it, so a re-add
 *  renders identically to the original add. */
export interface CuratedRun {
  insightId: string;
  config?: Record<string, unknown>;
}

type RunRegistry = Record<string, CuratedRun>;

const registryKey = (dashboardId: string, datasetId: number): string =>
  `${dashboardId}:${datasetId}`;

function isCuratedRun(value: unknown): value is CuratedRun {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CuratedRun).insightId === "string"
  );
}

function readRegistry(): RunRegistry {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    // Keep only well-formed entries so one corrupt value can't poison reads.
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, CuratedRun] =>
        isCuratedRun(entry[1])
      )
    );
  } catch {
    // Unavailable storage (SSR, privacy mode) or corrupt JSON → empty registry.
    return {};
  }
}

function writeRegistry(registry: RunRegistry): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch {
    // Quota/unavailable storage: reuse degrades to re-running the analysis.
  }
}

/** The run a template already produced on this dashboard, if remembered. */
export function getCuratedRun(
  dashboardId: string,
  datasetId: number
): CuratedRun | undefined {
  return readRegistry()[registryKey(dashboardId, datasetId)];
}

export function rememberCuratedRun(
  dashboardId: string,
  datasetId: number,
  run: CuratedRun
): void {
  writeRegistry({
    ...readRegistry(),
    [registryKey(dashboardId, datasetId)]: run,
  });
}

/** Drops a remembered run (e.g. the insight no longer exists on the backend). */
export function forgetCuratedRun(dashboardId: string, datasetId: number): void {
  const next = { ...readRegistry() };
  delete next[registryKey(dashboardId, datasetId)];
  writeRegistry(next);
}
