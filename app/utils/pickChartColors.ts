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
 */
export function pickChartColors(source: RawChartColors): ChartColorFields {
  return {
    ...(source.colorMap ? { colorMap: source.colorMap } : {}),
    ...(source.seriesColor ? { seriesColor: source.seriesColor } : {}),
    ...(source.divergentColors
      ? { divergentColors: source.divergentColors }
      : {}),
  };
}
