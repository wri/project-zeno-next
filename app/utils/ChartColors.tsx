import theme from "@/app/theme";
/**
 * A utility function to retrieve a specific, ordered array of chart colors
 * from the Chakra UI theme.
 * @returns {string[]} An array of hex color strings.
 */
export default function getChartColors() {
  const { tokens } = theme;
  const colors = tokens.categoryMap.get("colors")!;
  const allColors = Array.from(colors.values());

  // The desired order of colors for the chart
  const chartColorNames = [
    "cyan",
    "blue",
    "mint",
    "yellow",
    "green",
    "purple",
    "pink",
    "red",
    "orange",
    "berenjena",
  ];

  // Create a lookup map for fast access using the color's unique name
  // (e.g., "colors.cyan.500") as the key.
  const colorMap = new Map(allColors.map((color) => [color.name, color.value]));

  // Map over the ordered array and pull values directly from the map
  const chartColors = chartColorNames
    .map((name) => {
      const key = `colors.${name}.500`;
      return colorMap.get(key) || null; // Get the value by its key
    })
    .filter(Boolean); // This removes any nulls if a color wasn't found

  // Return the final, ordered array of colors
  return chartColors;
}
