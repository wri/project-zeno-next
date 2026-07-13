import type { LineLayerSpecification } from "maplibre-gl";

import type { BasemapTheme } from "../BasemapSelector";

type LinePaint = NonNullable<LineLayerSpecification["paint"]>;

/**
 * AOI boundary styling shared by the explorer map (GeoJsonLayers) and the
 * dashboard map widgets: a wide contrasting casing rendered beneath the main
 * line, both with zoom-interpolated widths.
 */

// On dark basemaps (dark, satellite) boundaries use white lines + blue casing
// to maximise contrast. On light basemaps the colours are inverted.
export function aoiBoundaryColors(
  basemapTheme: BasemapTheme,
  isMultiArea = false
) {
  const casingColor = basemapTheme === "dark" ? "#172B7A" : "#FFFFFF";
  const mainLineColor =
    basemapTheme === "dark" ? "#FFFFFF" : isMultiArea ? "#8EA4E8" : "#172B7A";
  return { casingColor, mainLineColor };
}

export function aoiCasingPaint(color: string, opacity = 1): LinePaint {
  return {
    "line-color": color,
    "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.5, 6, 7, 10, 11],
    "line-opacity": opacity,
  };
}

export function aoiLinePaint(color: string, opacity = 1): LinePaint {
  return {
    "line-color": color,
    "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 6, 1.5, 10, 2],
    "line-opacity": opacity,
  };
}

/** The solid rectangle drawn around an AOI's bounding box. */
export function aoiBboxLinePaint(color: string, opacity = 1): LinePaint {
  return {
    "line-color": color,
    "line-width": 1.5,
    "line-opacity": 0.75 * opacity,
  };
}
