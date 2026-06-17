import {
  FillLayerSpecification,
  LineLayerSpecification,
} from "react-map-gl/maplibre";

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
