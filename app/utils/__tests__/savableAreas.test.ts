import { describe, expect, it } from "vitest";

import type { Layer } from "@/app/store/layerManagerSlice";
import type { UserAoi } from "@/src/entities/user-aoi";
import { listSavableAreas } from "../savableAreas";

const layer = (featureRefs: Layer["featureRefs"]): Layer => ({
  id: "layer-1",
  name: "Selection",
  type: "geojson",
  visible: true,
  featureRefs,
});

const savedBrazil = {
  source: "gadm",
  src_id: "BRA",
} as UserAoi;

describe("listSavableAreas", () => {
  // Boundary clicks register the source as the map layer id ("GADM").
  it("lists each source area of a layer, in the API's lowercase", () => {
    const areas = listSavableAreas(
      layer([
        { name: "Brazil", source: "GADM", srcId: "BRA" },
        { name: "Yasuní", source: "wdpa", srcId: "555" },
      ]),
      []
    );

    expect(areas).toEqual([
      { source: "gadm", src_id: "BRA" },
      { source: "wdpa", src_id: "555" },
    ]);
  });

  it("leaves out areas already saved, custom areas and areas without an id", () => {
    const areas = listSavableAreas(
      layer([
        { name: "Brazil", source: "gadm", srcId: "BRA" },
        { name: "Farm plot", source: "custom", srcId: "ca-1" },
        { name: "Unmatched", source: "gadm" },
      ]),
      [savedBrazil]
    );

    expect(areas).toEqual([]);
  });
});
