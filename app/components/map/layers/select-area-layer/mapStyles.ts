import {
  FillLayerSpecification,
  LineLayerSpecification,
} from "react-map-gl/maplibre";

import { CONCESSION_FILL_OPACITY, type ConcessionStyle } from "@/app/types/map";

export const selectAreaFillPaint: FillLayerSpecification["paint"] = {
  "fill-color": "#172B7A",
  "fill-opacity": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.1,
    ["boolean", ["feature-state", "selected"], false],
    0.01,
    0,
  ],
};

export const selectAreaLinePaint: LineLayerSpecification["paint"] = {
  "line-color": "#BBC5EB",
  "line-width": 2,
};

/** A concession layer's fill in its commodity colour (see CONCESSION_STYLES). */
export function concessionFillPaint(
  style: ConcessionStyle
): FillLayerSpecification["paint"] {
  return {
    "fill-color": style.fillColor,
    "fill-opacity": CONCESSION_FILL_OPACITY,
  };
}

/** A concession layer's outline, for the layers GNW draws one for. */
export function concessionLinePaint(
  style: ConcessionStyle
): LineLayerSpecification["paint"] {
  return {
    "line-color": style.lineColor ?? style.fillColor,
    "line-width": style.lineWidth,
  };
}
