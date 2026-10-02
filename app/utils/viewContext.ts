import type { MapRef } from "react-map-gl/maplibre";

import type { InsightWidget } from "@/app/types/chat";
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

/**
 * The `view_context` sent with a chat request: the surface registered in
 * viewContextStore plus, on the map, fields computed fresh at send time. These
 * extra fields are never stored, so they can't go stale.
 */
export type ViewContextPayload =
  | Exclude<ViewContext, { page: "map" }>
  | { page: "map"; viewport?: Viewport; visible_insights?: string[] };

function buildViewport(mapRef: MapRef | null): Viewport | undefined {
  // The ref can outlive its map (e.g. across a desktop/mobile layout swap);
  // a viewport is optional context, so never let reading it break a send.
  try {
    const map = mapRef?.getMap();
    if (!map) return undefined;
    const bounds = map.getBounds();
    const rawWest = bounds.getWest();
    const rawEast = bounds.getEast();
    let west = -180;
    let east = 180;
    if (rawEast - rawWest < 360) {
      west = wrapLng(rawWest);
      // Keep a box that ends on the antimeridian at 180, not -180.
      east = wrapLng(rawEast) === -180 ? 180 : wrapLng(rawEast);
    }
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
  const ids = Array.from(
    new Set(
      insights
        .map((widget) => widget.insightId)
        .filter((id): id is string => Boolean(id))
    )
  );
  return ids.length > 0 ? ids : undefined;
}

// Extend the ambient `view_context` with map-only fields that are computed
// live at send time rather than tracked reactively in viewContextStore — the
// current map extent and which insights are shown on the map right now, read
// fresh from mapStore/insightStore for every request (same approach as
// `ui_context` in messageContext.ts).
export function enrichMapViewContext(
  base: ViewContext | null,
  mapRef: MapRef | null,
  insights: InsightWidget[]
): ViewContextPayload | null {
  if (!base || base.page !== "map") return base;

  const viewport = buildViewport(mapRef);
  const visible_insights = buildVisibleInsights(insights);

  // Built from `page` alone so only the live values (or their absence) are sent.
  return {
    page: "map",
    ...(viewport && { viewport }),
    ...(visible_insights && { visible_insights }),
  };
}
