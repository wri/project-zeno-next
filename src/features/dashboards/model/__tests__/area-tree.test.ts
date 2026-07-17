import { describe, expect, it } from "vitest";

import type { AreaPickerRow } from "../area-picker-rows";
import {
  areaRowKey,
  areaTypeLabel,
  buildAreaPickerTree,
  flattenAreaTree,
} from "../area-tree";

const row = (over: Partial<AreaPickerRow>): AreaPickerRow => ({
  source: "gadm",
  src_id: "",
  subtype: "state-province",
  name: "",
  typeLabel: "Administrative areas",
  previousAnalyses: 0,
  ...over,
});

const pan = row({ src_id: "PAN", subtype: "country", name: "Panama" });
const panama = row({ src_id: "PAN.2_1", name: "Panamá" });
const panamaCity = row({
  src_id: "PAN.2.3_1",
  subtype: "district-county",
  name: "Panama City",
});

describe("areaRowKey", () => {
  it("is the source-qualified src_id", () => {
    expect(areaRowKey(pan)).toBe("gadm:PAN");
  });
});

describe("buildAreaPickerTree", () => {
  it("nests admin areas under their matched ancestors", () => {
    const tree = buildAreaPickerTree([pan, panama, panamaCity]);

    expect(tree).toHaveLength(1);
    expect(tree[0].row).toBe(pan);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children).toHaveLength(1);

    const region = tree[0].children[0];
    expect(region.row).toBe(panama);
    expect(region.depth).toBe(1);
    expect(region.ancestorNames).toEqual(["Panama"]);

    const district = region.children[0];
    expect(district.row).toBe(panamaCity);
    expect(district.depth).toBe(2);
    expect(district.ancestorNames).toEqual(["Panama", "Panamá"]);
  });

  it("nests regardless of result order (child ranked before parent)", () => {
    const tree = buildAreaPickerTree([panama, pan]);
    expect(tree).toHaveLength(1);
    expect(tree[0].row).toBe(pan);
    expect(tree[0].children[0].row).toBe(panama);
  });

  it("attaches a deep area to the nearest matched ancestor when levels are missing", () => {
    const tree = buildAreaPickerTree([pan, panamaCity]);
    expect(tree).toHaveLength(1);
    const district = tree[0].children[0];
    expect(district.row).toBe(panamaCity);
    expect(district.depth).toBe(1);
    expect(district.ancestorNames).toEqual(["Panama"]);
  });

  it("keeps areas without a matched ancestor at the top level", () => {
    const windhoek = row({ src_id: "NAM.13.10_1", name: "Windhoek East" });
    const tree = buildAreaPickerTree([pan, windhoek]);
    expect(tree.map((n) => n.row)).toEqual([pan, windhoek]);
    expect(tree[1].children).toEqual([]);
    expect(tree[1].ancestorNames).toEqual([]);
  });

  it("keeps non-GADM rows flat even when ids look related", () => {
    const kba = row({
      source: "kba",
      src_id: "PAN.2_1",
      subtype: "site",
      name: "Some KBA",
      typeLabel: "Key biodiversity areas",
    });
    const tree = buildAreaPickerTree([pan, kba]);
    expect(tree.map((n) => n.row)).toEqual([pan, kba]);
  });

  it("preserves input order for roots and children", () => {
    const erongo = row({ src_id: "NAM.4_1", name: "Erongo" });
    const nam = row({ src_id: "NAM", subtype: "country", name: "Namibia" });
    const khomas = row({ src_id: "NAM.13_1", name: "Khomas" });
    const tree = buildAreaPickerTree([pan, nam, khomas, erongo]);
    expect(tree.map((n) => n.row.name)).toEqual(["Panama", "Namibia"]);
    expect(tree[1].children.map((n) => n.row.name)).toEqual([
      "Khomas",
      "Erongo",
    ]);
  });

  it("attaches children only to the first row of a duplicated GADM id", () => {
    const khomasV1 = row({ src_id: "NAM.13_1", name: "Khomas" });
    const khomasV2 = row({ src_id: "NAM.13_2", name: "Khomas (v2)" });
    const windhoek = row({ src_id: "NAM.13.10_1", name: "Windhoek East" });
    const tree = buildAreaPickerTree([khomasV1, khomasV2, windhoek]);

    expect(tree).toHaveLength(2);
    expect(tree[0].children.map((n) => n.row)).toEqual([windhoek]);
    expect(tree[1].children).toEqual([]);
  });

  it("does not mutate the input rows", () => {
    const input = [pan, panama];
    buildAreaPickerTree(input);
    expect(input).toEqual([pan, panama]);
    expect(pan).not.toHaveProperty("children");
  });
});

describe("flattenAreaTree", () => {
  const tree = buildAreaPickerTree([pan, panama, panamaCity]);

  it("lists every node depth-first when nothing is collapsed", () => {
    const flat = flattenAreaTree(tree, new Set());
    expect(flat.map((n) => n.row.name)).toEqual([
      "Panama",
      "Panamá",
      "Panama City",
    ]);
  });

  it("hides the whole subtree of a collapsed node", () => {
    const flat = flattenAreaTree(tree, new Set(["gadm:PAN"]));
    expect(flat.map((n) => n.row.name)).toEqual(["Panama"]);
  });

  it("hides only the deeper subtree when a mid-level node is collapsed", () => {
    const flat = flattenAreaTree(tree, new Set(["gadm:PAN.2_1"]));
    expect(flat.map((n) => n.row.name)).toEqual(["Panama", "Panamá"]);
  });
});

describe("areaTypeLabel", () => {
  it("labels GADM countries as Country", () => {
    expect(areaTypeLabel(pan)).toBe("Country");
  });

  it("labels other GADM levels as Administrative area", () => {
    expect(areaTypeLabel(panama)).toBe("Administrative area");
    expect(areaTypeLabel(panamaCity)).toBe("Administrative area");
  });

  it("keeps the source label for non-GADM rows", () => {
    expect(
      areaTypeLabel(
        row({
          source: "wdpa",
          subtype: "protected-area",
          typeLabel: "Protected areas",
        })
      )
    ).toBe("Protected areas");
  });
});
