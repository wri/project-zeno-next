import { create } from "zustand";

/**
 * A curated analysis that is on its way onto a dashboard: the analysis is
 * running, or has completed and its insight is being added as a widget. The
 * grid renders one loading module per entry so the dashboard reacts the
 * moment the user toggles a card, rather than when the whole chain lands.
 */
export interface PendingInsightWidget {
  /** `${dashboardId}:${datasetId}` — one pending module per curated card. */
  key: string;
  dashboardId: string;
  datasetId: number;
  /** The module title, "{Dataset} in {Area}". */
  title: string;
  datasetName: string;
  /** How many chart cards the analysis is expected to yield (1 or 2). */
  chartCountHint: number;
  /** The persisted insight id, once the run has completed and before the add lands. */
  insightId?: string;
  /** Epoch ms when the entry began; see `PENDING_INSIGHT_WIDGET_MAX_AGE_MS`. */
  startedAt: number;
}

/**
 * Safety valve: the client gives up polling after 60 s and the add settles in
 * seconds, so an entry older than this can only be one whose owner lost track
 * of it (the page was left mid-run). It is ignored rather than shown forever.
 */
export const PENDING_INSIGHT_WIDGET_MAX_AGE_MS = 90_000;

export function pendingInsightWidgetKey(
  dashboardId: string,
  datasetId: number
): string {
  return `${dashboardId}:${datasetId}`;
}

export type PendingInsightWidgetInput = Omit<
  PendingInsightWidget,
  "key" | "startedAt" | "insightId"
> & { startedAt?: number };

interface PendingInsightWidgetsState {
  entries: PendingInsightWidget[];
  /** Adds (or restarts) the entry for a dashboard + dataset; returns its key. */
  begin: (entry: PendingInsightWidgetInput) => string;
  /** Records the persisted insight id once the run has completed. */
  attachInsightId: (key: string, insightId: string) => void;
  clear: (key: string) => void;
  clearForDashboard: (dashboardId: string) => void;
  reset: () => void;
}

/**
 * Ephemeral, in-memory, shared between the Analyses pane (writer) and the
 * dashboard grid (reader), which live in different feature slices and must
 * not share component state. Deliberately not persisted: after a reload the
 * closure that would finish the add is gone, so a skeleton would never resolve.
 */
export const usePendingInsightWidgetsStore = create<PendingInsightWidgetsState>(
  (set) => ({
    entries: [],
    begin: (entry) => {
      const key = pendingInsightWidgetKey(entry.dashboardId, entry.datasetId);
      set((state) => ({
        entries: [
          ...state.entries.filter((e) => e.key !== key),
          { ...entry, key, startedAt: entry.startedAt ?? Date.now() },
        ],
      }));
      return key;
    },
    attachInsightId: (key, insightId) =>
      set((state) => ({
        entries: state.entries.map((e) =>
          e.key === key ? { ...e, insightId } : e
        ),
      })),
    clear: (key) =>
      set((state) => ({
        entries: state.entries.filter((e) => e.key !== key),
      })),
    clearForDashboard: (dashboardId) =>
      set((state) => ({
        entries: state.entries.filter((e) => e.dashboardId !== dashboardId),
      })),
    reset: () => set({ entries: [] }),
  })
);

/**
 * The live pending entries for one dashboard, oldest first, excluding entries
 * past the age valve. Pure, so the grid can also use it to decide whether a
 * pending entry has been superseded by a real widget.
 */
export function pendingInsightWidgetsFor(
  entries: readonly PendingInsightWidget[],
  dashboardId: string,
  now: number = Date.now()
): PendingInsightWidget[] {
  return entries.filter(
    (e) =>
      e.dashboardId === dashboardId &&
      now - e.startedAt < PENDING_INSIGHT_WIDGET_MAX_AGE_MS
  );
}
