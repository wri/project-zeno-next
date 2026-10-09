import { describe, expect, it } from "vitest";

import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
} from "@/app/constants/datasets";

const naturalLands = CONTEXT_LAYER_METADATA.natural_lands;
const sbtnCard = DATASET_CARDS.find((card) => card.dataset_id === 3);

/** Decodes the `colormap` query param into class value -> #RRGGBB. */
function rasterColors(tileUrl: string): Map<number, string> {
  const query = new URLSearchParams(tileUrl.split("?")[1]);
  const colormap: Record<string, number[]> = JSON.parse(
    query.get("colormap") ?? "{}"
  );
  const hex = (rgb: number[]) =>
    "#" +
    rgb
      .slice(0, 3)
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return new Map(Object.entries(colormap).map(([k, v]) => [Number(k), hex(v)]));
}

describe("SBTN natural sub-layers", () => {
  const naturalForest = CONTEXT_LAYER_METADATA.natural_forest;

  it("keeps the standalone card's natural classes", () => {
    // The sub-layers redraw these classes in a single colour, so the card's
    // own rows are the reference for which raster values are natural.
    const colors = rasterColors(sbtnCard!.tile_url!);
    expect([...colors.keys()].filter((v) => v <= 11)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(sbtnCard?.legend?.items).toHaveLength(11);
  });

  it("paints every natural class as one Natural lands colour", () => {
    // Integrated alerts count all natural classes (2-11), so the sub-layer
    // draws them as one swatch rather than the card's ten-class breakdown.
    const colors = rasterColors(naturalLands.tile_url!);

    expect([...colors.keys()].sort((a, b) => a - b)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(new Set(colors.values())).toEqual(new Set(["#A8DDB5"]));
    expect(naturalLands.legend.items).toEqual([
      { label: "Natural lands", color: "#A8DDB5" },
    ]);
  });

  it("paints only the counted forest classes beneath Tree cover loss", () => {
    // Tree cover loss counts natural forests (2), mangroves (5), wet natural
    // forests (8) and natural peat forests (9); every other class is left out
    // of the colormap, which the tile server renders transparent.
    const colors = rasterColors(naturalForest.tile_url!);

    expect([...colors.keys()].sort((a, b) => a - b)).toEqual([2, 5, 8, 9]);
    expect(new Set(colors.values())).toEqual(new Set(["#246E24"]));
    expect(naturalForest.legend.items).toEqual([
      { label: "Natural forest", color: "#246E24" },
    ]);
  });

  it("serves both from the SBTN raster with distinct legends", () => {
    for (const meta of [naturalLands, naturalForest]) {
      expect(meta.tile_url).toContain("/collections/natural-lands-v-1-1/");
    }
    expect(naturalForest.legend.title).not.toBe(naturalLands.legend.title);
    expect(naturalForest.legend.info).not.toBe(naturalLands.legend.info);
  });
});
