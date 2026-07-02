import { describe, expect, it } from "vitest";
import { toAreaSelection } from "../to-area-selection";

const metadata = {
  layer_id_mapping: { gadm: "gadm_id" },
  gadm_subtype_mapping: { GID_0: "country", GID_2: "municipality" },
};

describe("toAreaSelection (GADM)", () => {
  it("builds a country-level selection", () => {
    const selection = toAreaSelection(
      "GADM",
      { adm_level: 0, name_0: "Brazil", gid_0: "BRA" },
      metadata
    );

    expect(selection).toEqual({
      name: "Brazil",
      source: "gadm",
      srcId: "BRA",
      subtype: "country",
    });
  });

  it("composes nested admin names and uses the level's gid + subtype", () => {
    const selection = toAreaSelection(
      "GADM",
      {
        adm_level: 2,
        name_0: "Brazil",
        name_1: "São Paulo",
        name_2: "Campinas",
        gid_2: "BRA.25.52_1",
      },
      metadata
    );

    expect(selection).toEqual({
      name: "Campinas, São Paulo, Brazil",
      source: "gadm",
      srcId: "BRA.25.52_1",
      subtype: "municipality",
    });
  });
});
