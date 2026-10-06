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

describe("SBTN Natural Lands context sub-layer legend", () => {
  it("lists every natural class the raster paints, and nothing else", () => {
    // The backend masks the sub-layer to classes 2-11 (project-zeno#853), so
    // its legend has to cover exactly those colours: a missing one leaves
    // pixels unexplained, an extra one (non-natural) describes nothing drawn.
    const colors = rasterColors(sbtnCard!.tile_url!);
    const natural = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((v) => colors.get(v));

    expect(naturalLands.legend.items?.map((i) => i.color).sort()).toEqual(
      natural.sort()
    );
  });

  it("matches the standalone card minus its non-natural row", () => {
    expect(naturalLands.legend.title).toBe(sbtnCard?.legend?.title);
    expect([
      ...(naturalLands.legend.items ?? []),
      { label: "non-natural", color: "#D3D3D3" },
    ]).toEqual(sbtnCard?.legend?.items);
  });

  it("draws the same classes beneath Tree cover loss", () => {
    // The backend serves `natural_forest` from the same tile URL as
    // `natural_lands`; only what the parent dataset counts differs.
    const naturalForest = CONTEXT_LAYER_METADATA.natural_forest;

    expect(naturalForest.legend.items).toEqual(naturalLands.legend.items);
    expect(naturalForest.legend.info).not.toBe(naturalLands.legend.info);
  });
});
