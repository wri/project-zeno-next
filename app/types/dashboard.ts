import type { InsightWidget } from "@/app/types/chat";

// ---------------------------------------------------------------------------
// Dashboards prototype — client-only types
//
// A Dashboard is a saved collection of widgets pinned to an area of interest.
// This is a self-contained prototype: dashboards live in localStorage and are
// never sent to the backend. The shapes here intentionally mirror the existing
// InsightWidget so the production WidgetMessage renderer can be reused as-is.
// ---------------------------------------------------------------------------

export type DashboardWidgetKind = "insight" | "text" | "map" | "empty";

export interface DashboardMapWidget {
  caption: string; // e.g. "2021 alerts in Paraná, Brazil — last 3 months"
  alertCount?: number; // drives the alert-point density of the placeholder
  insetTitle?: string; // optional inset legend/title shown bottom-right
  center?: [number, number]; // [lng, lat] for the Mapbox static basemap snapshot
  zoom?: number; // basemap zoom level
}

export interface DashboardWidget {
  id: string;
  kind: DashboardWidgetKind;
  /** Grid column span on the detail page (1 = half width, 2 = full width). */
  span?: 1 | 2;
  /** Insight provenance — verified (curated) vs AI-assisted. Drives the label. */
  verified?: boolean;
  /** Present when kind === "insight" — rendered by the existing WidgetMessage. */
  insight?: InsightWidget;
  /** Present when kind === "text" — a free-text narrative block. */
  text?: string;
  /** Present when kind === "map" — a static map placeholder. */
  map?: DashboardMapWidget;
}

export interface Dashboard {
  id: string;
  title: string;
  /** Short descriptor under the title, e.g. a location or theme. */
  subtitle?: string;
  /** ISO timestamp of the last edit; formatted for display at render time. */
  updatedAt: string;
  /** Optional status pill, e.g. "3 new alerts". */
  badge?: string;
  widgets: DashboardWidget[];
}
