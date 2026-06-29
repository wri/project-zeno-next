import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Dashboard, DashboardWidget } from "@/app/types/dashboard";
import { DEFAULT_DASHBOARDS } from "@/app/dashboards/lib/fixtures";

// ---------------------------------------------------------------------------
// Dashboards prototype store
//
// Self-contained client state persisted to localStorage. Follows the manual
// hydrate() pattern used by cookieStore (rather than the persist middleware)
// so the server renders an empty list and we avoid hydration mismatches — the
// dashboards only ever appear after hydrate() runs in a client effect.
// ---------------------------------------------------------------------------

export const DASHBOARDS_STORAGE_KEY = "gnw_dashboards_prototype_v1";

interface DashboardState {
  dashboards: Dashboard[];
  hydrated: boolean;

  hydrate: () => void;
  getDashboard: (id: string) => Dashboard | undefined;
  /** Create a dashboard and return its id. */
  createDashboard: (partial?: Partial<Omit<Dashboard, "id">>) => string;
  updateDashboard: (id: string, patch: Partial<Omit<Dashboard, "id">>) => void;
  deleteDashboard: (id: string) => void;
  /** Append a widget (id auto-assigned if missing) and return its id. */
  addWidget: (
    dashboardId: string,
    widget: Omit<DashboardWidget, "id"> & { id?: string }
  ) => string;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  updateWidget: (
    dashboardId: string,
    widgetId: string,
    patch: Partial<Omit<DashboardWidget, "id">>
  ) => void;
  /** Move a widget within a dashboard (drag-to-reorder). */
  reorderWidgets: (dashboardId: string, from: number, to: number) => void;
}

function persist(dashboards: Dashboard[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(dashboards));
  } catch {
    // storage full or unavailable — prototype tolerates a lost write
  }
}

const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(DASHBOARDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Dashboard[];
        if (Array.isArray(parsed)) {
          set({ dashboards: parsed, hydrated: true });
          return;
        }
      }
    } catch {
      // corrupt storage — fall through to seeding
    }
    // First visit (or unreadable storage): seed with the designed dashboards.
    persist(DEFAULT_DASHBOARDS);
    set({ dashboards: DEFAULT_DASHBOARDS, hydrated: true });
  },

  getDashboard: (id) => get().dashboards.find((d) => d.id === id),

  createDashboard: (partial) => {
    const id = uuidv4();
    const dashboard: Dashboard = {
      id,
      title: partial?.title ?? "Untitled dashboard",
      subtitle: partial?.subtitle,
      updatedAt: new Date().toISOString(),
      badge: partial?.badge,
      isPublic: partial?.isPublic,
      tags: partial?.tags,
      widgets: partial?.widgets ?? [],
    };
    const dashboards = [dashboard, ...get().dashboards];
    persist(dashboards);
    set({ dashboards });
    return id;
  },

  updateDashboard: (id, patch) => {
    const dashboards = get().dashboards.map((d) =>
      d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
    );
    persist(dashboards);
    set({ dashboards });
  },

  deleteDashboard: (id) => {
    const dashboards = get().dashboards.filter((d) => d.id !== id);
    persist(dashboards);
    set({ dashboards });
  },

  addWidget: (dashboardId, widget) => {
    const widgetId = widget.id ?? uuidv4();
    const full: DashboardWidget = { ...widget, id: widgetId };
    const dashboards = get().dashboards.map((d) =>
      d.id === dashboardId
        ? {
            ...d,
            widgets: [...d.widgets, full],
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    persist(dashboards);
    set({ dashboards });
    return widgetId;
  },

  removeWidget: (dashboardId, widgetId) => {
    const dashboards = get().dashboards.map((d) =>
      d.id === dashboardId
        ? {
            ...d,
            widgets: d.widgets.filter((wgt) => wgt.id !== widgetId),
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    persist(dashboards);
    set({ dashboards });
  },

  updateWidget: (dashboardId, widgetId, patch) => {
    const dashboards = get().dashboards.map((d) =>
      d.id === dashboardId
        ? {
            ...d,
            widgets: d.widgets.map((wgt) =>
              wgt.id === widgetId ? { ...wgt, ...patch } : wgt
            ),
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    persist(dashboards);
    set({ dashboards });
  },

  reorderWidgets: (dashboardId, from, to) => {
    const dashboards = get().dashboards.map((d) => {
      if (d.id !== dashboardId) return d;
      const widgets = [...d.widgets];
      if (
        from < 0 ||
        to < 0 ||
        from >= widgets.length ||
        to >= widgets.length ||
        from === to
      ) {
        return d;
      }
      const [moved] = widgets.splice(from, 1);
      widgets.splice(to, 0, moved);
      return { ...d, widgets, updatedAt: new Date().toISOString() };
    });
    persist(dashboards);
    set({ dashboards });
  },
}));

export default useDashboardStore;
