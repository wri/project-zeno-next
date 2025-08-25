import {
  FillLayerSpecification,
  LineLayerSpecification,
} from "react-map-gl/maplibre";

export const selectAreaFillPaint: FillLayerSpecification["paint"] = {
  "fill-color": "#4B88D8",
  "fill-opacity": [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    0.48,
    ["boolean", ["feature-state", "selected"], false],
    0.08,
    0,
  ],
};

export const selectAreaLinePaint: LineLayerSpecification["paint"] = {
  "line-color": "#BBC5EB",
  "line-width": 2,
};
