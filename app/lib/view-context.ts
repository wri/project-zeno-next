import useMapStore from "@/app/store/mapStore";
import useInsightStore from "@/app/store/insightStore";
import type { ViewContext } from "@/app/types/chat";

// Coordinates are rounded to ~5 decimals (~1m). The agent only needs a coarse
// sense of what's on screen, and full float precision just bloats the payload.
function round(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/**
 * Which app surface the user is currently on, reported as `view_context.page`.
 * Derived from the route and pure (takes a pathname) so it can be unit-tested.
 */
export function pageFromPath(pathname: string): "dashboard" | "explorer" {
  // Note: /dashboard (singular) is the user-settings page, not a dashboard.
  return pathname.startsWith("/dashboards") ? "dashboard" : "explorer";
}

// The dashboard currently on screen, set by the dashboard detail page on
// mount and cleared on unmount. Module-level rather than a store because
// nothing renders from it — it is only read imperatively at send time.
let activeDashboard: { id: string; name: string } | null = null;

export function setActiveDashboard(
  dashboard: { id: string; name: string } | null
) {
  activeDashboard = dashboard;
}

/**
 * Snapshot of what the user is currently looking at, sent alongside each chat
 * request as `view_context`. The backend stores it as-is and surfaces it on
 * demand via the `inspect_view_context` tool — it is NOT injected into the
 * prompt or merged into the agent's selections.
 *
 * Reads imperatively from `mapStore` (the live MapLibre instance + layer
 * manager), mirroring the tool-handler pattern of touching stores via
 * `.getState()` outside React. Returns `undefined` when there is nothing
 * meaningful to report so the caller can omit the field entirely.
 *
 * `visible_insights` is the list of insight ids currently in the workspace
 * (deduplicated — several charts can share one insight).
 */
export function buildViewContext(): ViewContext | undefined {
  const { mapRef, layers, geoJsonRegistry } = useMapStore.getState();

  const view: ViewContext = {
    page:
      typeof window !== "undefined"
        ? pageFromPath(window.location.pathname)
        : "explorer",
  };

  if (view.page === "dashboard" && activeDashboard) {
    view.dashboard_id = activeDashboard.id;
    view.dashboard_name = activeDashboard.name;
  }

  const map = mapRef?.getMap();
  if (map) {
    const bounds = map.getBounds();
    view.viewport = {
      bbox: [
        round(bounds.getWest()),
        round(bounds.getSouth()),
        round(bounds.getEast()),
        round(bounds.getNorth()),
      ],
      zoom: round(map.getZoom()),
    };
  }

  const visibleLayers = layers
    .filter((l) => l.visible)
    .map((l) => ({ id: l.id, name: l.name }));
  if (visibleLayers.length > 0) {
    view.visible_layers = visibleLayers;
  }

  // Derive AOIs from *visible layers*, not the raw geoJsonRegistry. The
  // registry is append-only within a thread (entries are never pruned on chip
  // removal, only on reset), so it over-reports stale/hidden AOIs. The layer
  // manager, by contrast, is pruned by removeContext→removeLayer and carries
  // the `visible` flag — it reflects what's actually on the map.
  //
  //  - Manual AOIs (draw/upload/click) carry `featureRefs`; resolve each
  //    against the registry to recover its src_id.
  //  - Agent picks and the global "all countries" selection carry
  //    `aoiSelection`; use those AOIs directly.
  const visibleAois: NonNullable<ViewContext["visible_aois"]> = [];
  const seen = new Set<string>();
  const pushAoi = (aoi: { source: string; src_id?: string; name: string }) => {
    const key = `${aoi.source}|${aoi.src_id ?? ""}|${aoi.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    visibleAois.push(aoi);
  };

  for (const layer of layers) {
    if (!layer.visible) continue;
    if (layer.featureRefs?.length) {
      for (const ref of layer.featureRefs) {
        const entry = geoJsonRegistry.find(
          (e) => e.ref.name === ref.name && e.ref.source === ref.source
        );
        pushAoi({ source: ref.source, src_id: entry?.srcId, name: ref.name });
      }
    } else if (layer.aoiSelection?.aois?.length) {
      for (const aoi of layer.aoiSelection.aois) {
        pushAoi({ source: aoi.source, src_id: aoi.src_id, name: aoi.name });
      }
    }
  }
  if (visibleAois.length > 0) {
    view.visible_aois = visibleAois;
  }

  const insightIds = [
    ...new Set(
      useInsightStore
        .getState()
        .insights.map((w) => w.insightId)
        .filter((id): id is string => !!id)
    ),
  ];
  if (insightIds.length > 0) {
    view.visible_insights = insightIds;
  }

  // Only the always-present `page` key? Nothing useful to report yet.
  // (Dashboard pages have no map, so the dashboard id alone counts.)
  if (
    !view.viewport &&
    !view.visible_layers &&
    !view.visible_aois &&
    !view.visible_insights &&
    !view.dashboard_id
  ) {
    return undefined;
  }

  return view;
}
