import theme from "@/app/theme";

/**
 * Retrieves an ordered array of chart colors from the Chakra UI theme.
 *
 * The order is chosen to maximise perceptual distance for common forms
 * of color-vision deficiency (deuteranopia, protanopia, tritanopia).
 * Adjacent colors in the sequence should remain distinguishable even
 * when reds/greens or blues/yellows are confused.
 *
 * @returns An array of hex color strings.
 */
export default function getChartColors(): string[] {
  const { tokens } = theme;
  const colors = tokens.categoryMap.get("colors")!;
  const allColors = Array.from(colors.values());

  // Ordered for maximum colorblind-safe contrast between neighbours:
  //   blue → orange → green → pink → cyan → red → purple → yellow → mint → berenjena
  const chartColorNames = [
    "blue",
    "orange",
    "green",
    "pink",
    "cyan",
    "red",
    "purple",
    "yellow",
    "mint",
    "berenjena",
  ];

  const colorMap = new Map(allColors.map((c) => [c.name, c.value]));

  return chartColorNames
    .map((name) => colorMap.get(`colors.${name}.500`) || null)
    .filter((v): v is string => v !== null);
}

/**
 * Stroke dash patterns for multi-series line / area charts.
 * Using distinct dash arrays provides a secondary (non-color) encoding
 * so that series remain distinguishable for colorblind users or in
 * greyscale print.
 *
 * Index 0 = solid (primary series), then increasingly distinctive dashes.
 */
export const STROKE_DASH_PATTERNS: string[] = [
  "0",         // solid
  "6 3",       // short dash
  "2 2",       // dotted
  "10 4",      // long dash
  "10 4 2 4",  // dash-dot
  "6 3 2 3 2 3", // dash-dot-dot
  "14 4",      // extra-long dash
  "4 4",       // medium dash
  "8 3 2 3",   // long-dash-dot
  "2 6",       // sparse dot
];
