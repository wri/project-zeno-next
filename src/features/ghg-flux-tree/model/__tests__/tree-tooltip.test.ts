import { describe, expect, it } from "vitest";

import { nodeNet, type FluxNode, type FluxRow } from "../hierarchy";
import { EMISSIONS_COLOR, REMOVALS_COLOR } from "../palette";
import { fluxTreeTooltipModel } from "../tree-tooltip";

/** A leaf row for the node given, with its net derived as production does. */
const row = (over: Partial<FluxNode> & { id: string }): FluxRow => {
  const node: FluxNode = {
    parentId: null,
    label: over.id,
    avgEmissions: null,
    avgRemovals: null,
    ...over,
  };
  return {
    node,
    depth: 1,
    hasChildren: false,
    expanded: false,
    net: nodeNet(node),
  };
};

const vegetation = row({
  id: "veg",
  label: "Vegetation",
  avgEmissions: 530,
  avgRemovals: -710,
});

describe("fluxTreeTooltipModel", () => {
  it("under the gross measure lists Emissions and Removals in the bar colours, then Net flux", () => {
    const { rows, total } = fluxTreeTooltipModel(vegetation, "gross");

    expect(rows).toEqual([
      {
        key: "emissions",
        label: "Emissions",
        value: 530,
        color: EMISSIONS_COLOR,
      },
      {
        key: "removals",
        label: "Removals",
        value: -710,
        color: REMOVALS_COLOR,
      },
    ]);
    expect(total).toEqual({ label: "Net flux", value: -180 });
  });

  it("under the net measure reduces to the Net flux line alone", () => {
    const { rows, total } = fluxTreeTooltipModel(vegetation, "net");

    expect(rows).toEqual([]);
    expect(total).toEqual({ label: "Net flux", value: -180 });
  });

  it("skips the side a single-sided node has no figure for", () => {
    const gain = row({ id: "gain", label: "Tree gain", avgRemovals: -560 });

    const { rows } = fluxTreeTooltipModel(gain, "gross");

    expect(rows.map((r) => r.label)).toEqual(["Removals"]);
  });

  it("has no total for a node with neither figure", () => {
    const empty = row({ id: "none", label: "Nothing" });

    expect(fluxTreeTooltipModel(empty, "gross")).toEqual({
      rows: [],
      total: null,
    });
  });
});
