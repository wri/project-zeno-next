import { extent, scaleLinear } from "d3";

import { SymbolColor, SymbolColorValue } from "./types";

/**
 * Utility to generate a CSS linear-gradient string from a color list or color/value stops.
 * @param colors - Array of color strings or color/value objects.
 * @returns CSS linear-gradient string.
 */
export function makeColorRamp(colors: SymbolColor[] | SymbolColorValue[]) {
  if (typeof colors[0] === "string") {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }

  if (colors[0].color && typeof colors[0].value === "number") {
    // Create a linear scale.
    const c = colors as SymbolColorValue<number>[];
    const e = extent(c, (d) => d.value) as [number, number];
    const scale = scaleLinear().domain(e).range([0, 100]);

    return `linear-gradient(to right, ${c
      .map((stop) => `${stop.color} ${scale(stop.value)}%`)
      .join(", ")})`;
  }
}
