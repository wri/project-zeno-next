/**
 * Domain-specific color mappings for chart categories.
 *
 * Each key is a data field name (e.g. the xAxis key from the API).
 * The value is an ordered array of { value, color } pairs that map
 * categorical values to specific hex colors.
 *
 * These are used by formatChartData() to assign consistent, meaningful
 * colors to pie slices and other categorical chart elements.
 */

export interface ColorMapEntry {
  value: string;
  color: string;
}

const CHART_COLOR_MAPPING: Record<string, ColorMapEntry[]> = {
  land_cover_type: [
    { value: "Tree cover", color: "#246E24" },
    { value: "Short vegetation", color: "#B9B91E" },
    { value: "Wetland – short vegetation", color: "#74D6B4" },
    { value: "Bare and sparse vegetation", color: "#FEFECC" },
    { value: "Water", color: "#6BAED6" },
    { value: "Snow/ice", color: "#ACD1E8" },
    { value: "Cropland", color: "#fff183" },
    { value: "Cultivated grasslands", color: "#FFCD73" },
    { value: "Built-up", color: "#e8765d" },
  ],
  land_type: [
    { value: "Natural forests", color: "#246E24" },
    { value: "Natural peat forests", color: "#093D09" },
    { value: "Natural peat short vegetation", color: "#99991A" },
    { value: "Mangroves", color: "#06A285" },
    { value: "Wet natural forests", color: "#589558" },
    { value: "Wet natural short vegetation", color: "#DBDB7B" },
    { value: "Natural short vegetation", color: "#B9B91E" },
    { value: "Natural water", color: "#6BAED6" },
    { value: "Bare", color: "#FEFECC" },
    { value: "Snow", color: "#ACD1E8" },
    { value: "Crop", color: "#D3D3D3" },
    { value: "Built", color: "#D3D3D3" },
    { value: "Non-natural tree cover", color: "#D3D3D3" },
    { value: "Non-natural short vegetation", color: "#D3D3D3" },
    { value: "Wet non-natural tree cover", color: "#D3D3D3" },
    { value: "Non-natural peat tree cover", color: "#D3D3D3" },
    { value: "Wet non-natural short vegetation", color: "#D3D3D3" },
    { value: "Non-natural peat short vegetation", color: "#D3D3D3" },
    { value: "Non-natural water", color: "#D3D3D3" },
    { value: "Non-natural bare", color: "#D3D3D3" },
    { value: "Other", color: "#D3D3D3" },
  ],
  driver: [
    { value: "Logging", color: "#52A44E" },
    { value: "Shifting cultivation", color: "#E9D700" },
    { value: "Wildfire", color: "#885128" },
    { value: "Other natural disturbances", color: "#3B209A" },
    { value: "Settlements & Infrastructure", color: "#A354A0" },
    { value: "Hard commodities", color: "#E58074" },
    { value: "Permanent agriculture", color: "#E39D29" },
    { value: "Unknown", color: "#D3D3D3" },
  ],
};

export default CHART_COLOR_MAPPING;

/**
 * Dataset-level series colors for single-series charts (bar, line, area, scatter).
 * Maps dataset_name values to a signature hex color used as the primary series color.
 * Multi-series charts continue to use the default theme palette.
 */
export const DATASET_SERIES_COLORS: Record<string, string> = {
  "Tree cover loss": "#DC6C9A",
  "Global all ecosystem disturbance alerts (DIST-ALERT)": "#f69",
  "Tree cover": "#97BD3D",
  "Tree cover gain": "#3F08F5",
  "Global natural/semi-natural grassland extent": "#ff9916",
  "Tree cover loss by dominant driver": "#DC6C9A",
};

/**
 * Divergent color mapping for datasets with positive/negative semantics.
 * Used for per-bar coloring in bar charts based on value sign.
 * For line/area charts, falls back to the positive color as a single series color.
 */
export const DATASET_DIVERGENT_COLORS: Record<string, { positive: string; negative: string }> = {
  "Forest greenhouse gas net flux (2001-2024)": {
    negative: "#137375",  // teal-green (sink/removals)
    positive: "#9a65c0",  // purple (source/emissions)
  },
};
