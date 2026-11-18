import type { MapRef } from "react-map-gl/maplibre";

import type { InsightWidget } from "@/app/types/chat";
import type { InsightState } from "@/app/store/insightStore";
import type { ViewContext } from "@/app/store/viewContextStore";

// Keep the payload compact — the backend only echoes these back to the agent
// as reasoning context, not for precise geometry.
const round = (n: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

// MapLibre's bounds aren't wrapped: past the antimeridian or zoomed out on a
// wide screen they run outside ±180 (e.g. 190, -337). Wrap into [-180, 180).
const wrapLng = (lng: number): number =>
  ((((lng + 180) % 360) + 360) % 360) - 180;

type Viewport = { bbox: [number, number, number, number]; zoom: number };

/** The chart on screen: its insight, and its position among that insight's charts. */
type FocusedInsight = { id: string; chart_position?: number };

/** The parts of insightStore the map's view context is built from. */
export type InsightWorkspaceState = Pick<
  InsightState,
  "insights" | "focusedWidgetId" | "isWorkspaceCollapsed"
>;

/**
 * The `view_context` sent with a chat request: the surface registered in
 * viewContextStore plus, on the map, fields computed fresh at send time. These
 * extra fields are never stored, so they can't go stale.
 *
 * `visible_insights` is every insight in the map workspace, not only the one
 * on screen: the card pages through them. `focused_insight` is the chart the
 * card is showing, and is omitted when the card is collapsed.
 */
export type ViewContextPayload =
  | Exclude<ViewContext, { page: "map" }>
  | {
      page: "map";
      viewport?: Viewport;
      visible_insights?: string[];
      focused_insight?: FocusedInsight;
    };

function buildViewport(mapRef: MapRef | null): Viewport | undefined {
  // The ref can outlive its map (e.g. across a desktop/mobile layout swap);
  // a viewport is optional context, so never let reading it break a send.
  try {
    const map = mapRef?.getMap();
    if (!map) return undefined;
    const bounds = map.getBounds();
    const rawWest = bounds.getWest();
    const rawEast = bounds.getEast();
    const wrappedEast = wrapLng(rawEast);
    // A span of 360° or more is the whole world. Otherwise keep a box that
    // ends on the antimeridian at 180, not -180.
    const [west, east] =
      rawEast - rawWest < 360
        ? [wrapLng(rawWest), wrappedEast === -180 ? 180 : wrappedEast]
        : [-180, 180];
    // A box crossing the antimeridian keeps west > east (RFC 7946 §5.2).
    return {
      bbox: [
        round(west, 4),
        round(bounds.getSouth(), 4),
        round(east, 4),
        round(bounds.getNorth(), 4),
      ],
      zoom: round(map.getZoom(), 2),
    };
  } catch {
    return undefined;
  }
}

function buildVisibleInsights(insights: InsightWidget[]): string[] | undefined {
  const ids = [
    ...new Set(insights.flatMap((w) => (w.insightId ? [w.insightId] : []))),
  ];
  return ids.length > 0 ? ids : undefined;
}

function buildFocusedInsight({
  insights,
  focusedWidgetId,
  isWorkspaceCollapsed,
}: InsightWorkspaceState): FocusedInsight | undefined {
  if (isWorkspaceCollapsed || !focusedWidgetId) return undefined;
  const widget = insights.find((w) => w.id === focusedWidgetId);
  if (!widget?.insightId) return undefined;
  return { id: widget.insightId, chart_position: widget.chartPosition };
}

// Read fresh from mapStore/insightStore on every request, like `ui_context`
// in messageContext.ts.
export function enrichMapViewContext(
  base: ViewContext | null,
  mapRef: MapRef | null,
  workspace: InsightWorkspaceState
): ViewContextPayload | null {
  if (!base || base.page !== "map") return base;

  const viewport = buildViewport(mapRef);
  const visible_insights = buildVisibleInsights(workspace.insights);
  const focused_insight = buildFocusedInsight(workspace);

  // Built from `page` alone so only the live values (or their absence) are sent.
  return {
    page: "map",
    ...(viewport && { viewport }),
    ...(visible_insights && { visible_insights }),
    ...(focused_insight && { focused_insight }),
  };
}
