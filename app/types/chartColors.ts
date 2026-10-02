/**
 * Positive/negative color pair for divergent (signed-value) charts and the
 * dataset legends that share those semantics.
 */
export interface DivergentColors {
  positive: string;
  negative: string;
}

/**
 * Backend-resolved chart colors (phase 2 of the color registry — see
 * docs/insight-chart-colors-plan.md in project-zeno): category slug → hex,
 * a single-series color, and the divergent pair.
 *
 * Every field is optional; when one is absent the local
 * `app/config/chartColorMappings.ts` config applies (pre-migration insights,
 * or a category with no registry entry). Mixed into `InsightWidget` and read
 * by `formatChartData`, so the shape has a single home.
 */
export interface ChartColorFields {
  colorMap?: Record<string, string>;
  seriesColor?: string;
  divergentColors?: DivergentColors;
}
