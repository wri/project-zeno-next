import type { MapRef } from "react-map-gl/maplibre";

import type { InsightWidget } from "@/app/types/chat";
import type { InsightState } from "@/app/store/insightStore";
import type { ViewContext } from "@/app/store/viewContextStore";
import type { Layer } from "@/app/store/layerManagerSlice";

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

/**
 * A satellite imagery capture shown on the map. A capture rendered in the
 * browser reports its scene search here (`status`, scene count, dates), so
 * the agent learns on the next message what its show_imagery call (or the
 * user's Edit) produced.
 */
export type VisibleImagery = {
  imagery_id: string;
  provider: string;
  render: "client" | "tiler";
  status?: string;
  aoi_names: string[];
  target_date?: string;
  window_days?: number;
  max_cloud_cover?: number;
  item_count?: number;
  start_date?: string;
  end_date?: string;
};

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
      visible_imagery?: VisibleImagery[];
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

const orUndefined = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

export function buildVisibleImagery(
  layers: Layer[]
): VisibleImagery[] | undefined {
  const entries = layers.flatMap((layer): VisibleImagery[] => {
    const imagery = layer.imagery;
    if (!imagery || !layer.visible) return [];
    return [
      {
        imagery_id: imagery.mosaic_id,
        provider: imagery.provider ?? "sentinel-2",
        render: layer.sentinel2 ? "client" : "tiler",
        ...(layer.sentinel2 && { status: layer.sentinel2.status }),
        aoi_names: imagery.aoi_names,
        target_date: orUndefined(imagery.target_date),
        window_days: orUndefined(imagery.window_days),
        max_cloud_cover: orUndefined(imagery.max_cloud_cover),
        item_count: orUndefined(imagery.item_count),
        start_date: orUndefined(imagery.start_date ?? imagery.date_start),
        end_date: orUndefined(imagery.end_date ?? imagery.date_end),
      },
    ];
  });
  return entries.length > 0 ? entries : undefined;
}

// Read fresh from mapStore/insightStore on every request, like `ui_context`
// in messageContext.ts.
export function enrichMapViewContext(
  base: ViewContext | null,
  mapRef: MapRef | null,
  workspace: InsightWorkspaceState,
  layers: Layer[] = []
): ViewContextPayload | null {
  if (!base || base.page !== "map") return base;

  const viewport = buildViewport(mapRef);
  const visible_insights = buildVisibleInsights(workspace.insights);
  const focused_insight = buildFocusedInsight(workspace);
  const visible_imagery = buildVisibleImagery(layers);

  // Built from `page` alone so only the live values (or their absence) are sent.
  return {
    page: "map",
    ...(viewport && { viewport }),
    ...(visible_insights && { visible_insights }),
    ...(focused_insight && { focused_insight }),
    ...(visible_imagery && { visible_imagery }),
  };
}
