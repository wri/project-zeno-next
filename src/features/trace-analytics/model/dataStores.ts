"use client";

/**
 * Fetched-data stores. Data survives page navigation and refreshes
 * automatically when the fetch signature (date window + environment)
 * changes; stores keep the signature so unchanged filters reuse the cache.
 */

import { create } from "zustand";
import type {
  GnwUser,
  SessionRow,
  TraceDetail,
  TraceListEntry,
  TraceRow,
} from "./types";

export type FetchStatus = "idle" | "loading" | "loaded" | "error";

interface FetchMeta {
  readonly status: FetchStatus;
  readonly error: string | null;
  readonly progress: number;
  /** Epoch ms of the last successful fetch. */
  readonly fetchedAt: number | null;
  /** Filter signature the current data was fetched with. */
  readonly signature: string | null;
}

const idleMeta: FetchMeta = {
  status: "idle",
  error: null,
  progress: 0,
  fetchedAt: null,
  signature: null,
};

// --- Analytics rows (current + previous window for deltas) -------------------

interface AnalyticsState extends FetchMeta {
  readonly rows: readonly TraceRow[];
  /** Rows for the equal-length window immediately before the current one. */
  readonly prevRows: readonly TraceRow[] | null;
  readonly fetchedRange: { startDate: string; endDate: string } | null;
  readonly start: (signature: string) => void;
  readonly setProgress: (progress: number) => void;
  readonly succeed: (payload: {
    rows: readonly TraceRow[];
    prevRows: readonly TraceRow[] | null;
    startDate: string;
    endDate: string;
    signature: string;
  }) => void;
  readonly fail: (error: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()((set) => ({
  ...idleMeta,
  rows: [],
  prevRows: null,
  fetchedRange: null,
  start: (signature) =>
    set({ status: "loading", error: null, progress: 0, signature }),
  setProgress: (progress) => set({ progress }),
  succeed: ({ rows, prevRows, startDate, endDate, signature }) =>
    set({
      status: "loaded",
      rows,
      prevRows,
      error: null,
      signature,
      fetchedAt: Date.now(),
      fetchedRange: { startDate, endDate },
    }),
  fail: (error) => set({ status: "error", error }),
}));

// --- Users (first-seen + id → email lookup) ----------------------------------

interface UsersState extends FetchMeta {
  readonly users: readonly GnwUser[];
  readonly firstSeenByUser: ReadonlyMap<string, string> | null;
  readonly emailByUserId: ReadonlyMap<string, string> | null;
  readonly start: () => void;
  readonly setProgress: (progress: number) => void;
  readonly succeed: (
    users: readonly GnwUser[],
    firstSeenByUser: ReadonlyMap<string, string>
  ) => void;
  readonly fail: (error: string) => void;
}

export const useUsersStore = create<UsersState>()((set) => ({
  ...idleMeta,
  users: [],
  firstSeenByUser: null,
  emailByUserId: null,
  start: () => set({ status: "loading", error: null, progress: 0 }),
  setProgress: (progress) => set({ progress }),
  succeed: (users, firstSeenByUser) =>
    set({
      status: "loaded",
      users,
      firstSeenByUser,
      emailByUserId: new Map(users.map((u) => [u.id, u.email])),
      error: null,
      fetchedAt: Date.now(),
    }),
  fail: (error) => set({ status: "error", error }),
}));

// --- Sessions (Conversation Browser) ----------------------------------------

interface SessionsState extends FetchMeta {
  readonly sessions: readonly SessionRow[];
  readonly start: (signature: string) => void;
  readonly setProgress: (progress: number) => void;
  readonly succeed: (
    sessions: readonly SessionRow[],
    signature: string
  ) => void;
  readonly fail: (error: string) => void;
}

export const useSessionsStore = create<SessionsState>()((set) => ({
  ...idleMeta,
  sessions: [],
  start: (signature) =>
    set({ status: "loading", error: null, progress: 0, signature }),
  setProgress: (progress) => set({ progress }),
  succeed: (sessions, signature) =>
    set({
      status: "loaded",
      sessions,
      error: null,
      signature,
      fetchedAt: Date.now(),
    }),
  fail: (error) => set({ status: "error", error }),
}));

// --- Trace Explorer -----------------------------------------------------------

interface ExplorerState extends FetchMeta {
  readonly entries: readonly TraceListEntry[];
  readonly selectedId: string | null;
  readonly detailCache: Readonly<Record<string, TraceDetail>>;
  readonly detailStatus: FetchStatus;
  readonly detailError: string | null;
  readonly start: () => void;
  readonly setProgress: (progress: number) => void;
  readonly succeed: (entries: readonly TraceListEntry[]) => void;
  readonly fail: (error: string) => void;
  readonly select: (traceId: string | null) => void;
  readonly startDetail: () => void;
  readonly cacheDetail: (detail: TraceDetail) => void;
  readonly failDetail: (error: string) => void;
}

export const useExplorerStore = create<ExplorerState>()((set) => ({
  ...idleMeta,
  entries: [],
  selectedId: null,
  detailCache: {},
  detailStatus: "idle",
  detailError: null,
  start: () => set({ status: "loading", error: null, progress: 0 }),
  setProgress: (progress) => set({ progress }),
  succeed: (entries) =>
    set({
      status: "loaded",
      entries,
      error: null,
      fetchedAt: Date.now(),
      selectedId: entries.length ? entries[0].id : null,
    }),
  fail: (error) => set({ status: "error", error }),
  select: (traceId) => set({ selectedId: traceId }),
  startDetail: () => set({ detailStatus: "loading", detailError: null }),
  cacheDetail: (detail) =>
    set((state) => ({
      detailStatus: "loaded",
      detailCache: { ...state.detailCache, [detail.id]: detail },
    })),
  failDetail: (error) => set({ detailStatus: "error", detailError: error }),
}));
