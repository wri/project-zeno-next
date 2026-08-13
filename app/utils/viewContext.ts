import { MapRef } from "react-map-gl/maplibre";

import type { InsightWidget } from "@/app/types/chat";
import type { ViewContext } from "@/app/store/viewContextStore";

// Keep the payload compact — the backend only echoes these back to the agent
// as reasoning context, not for precise geometry.
const round = (n: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

type Viewport = NonNullable<Extract<ViewContext, { page: "map" }>["viewport"]>;

function buildViewport(mapRef: MapRef | null): Viewport | undefined {
  const map = mapRef?.getMap();
  if (!map) return undefined;
  const bounds = map.getBounds();
  return {
    bbox: [
      round(bounds.getWest(), 4),
      round(bounds.getSouth(), 4),
      round(bounds.getEast(), 4),
      round(bounds.getNorth(), 4),
    ],
    zoom: round(map.getZoom(), 2),
  };
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
): ViewContext | null {
  if (!base || base.page !== "map") return base;

  const viewport = buildViewport(mapRef);
  const visible_insights = buildVisibleInsights(insights);

  return {
    ...base,
    ...(viewport && { viewport }),
    ...(visible_insights && { visible_insights }),
  };
}
