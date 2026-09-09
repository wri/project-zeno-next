import type {
  ChartColorFields,
  DivergentColors,
} from "@/app/types/chartColors";

/** Transport shape of the color fields: the backend sends `null`, not absent. */
interface RawChartColors {
  colorMap?: Record<string, string> | null;
  seriesColor?: string | null;
  divergentColors?: DivergentColors | null;
}

/**
 * Narrows a transport-shaped chart to the `ChartColorFields` mixin, omitting
 * empty fields entirely rather than carrying `null`/`undefined` through — so a
 * missing registry entry falls through to the local color config downstream.
 *
 * An empty `colorMap` (`{}`, what the backend sends when the registry has no
 * entry for a chart) counts as absent: carrying it through would make
 * `formatChartData` take the backend-colours branch, which orders the legend
 * by first appearance instead of by the local palette, for no colour at all.
 */
export function pickChartColors(source: RawChartColors): ChartColorFields {
  const colorMap =
    source.colorMap && Object.keys(source.colorMap).length > 0
      ? source.colorMap
      : undefined;
  return {
    ...(colorMap ? { colorMap } : {}),
    ...(source.seriesColor ? { seriesColor: source.seriesColor } : {}),
    ...(source.divergentColors
      ? { divergentColors: source.divergentColors }
      : {}),
  };
}
