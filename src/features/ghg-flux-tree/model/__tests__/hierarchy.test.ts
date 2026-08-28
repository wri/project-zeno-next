import { describe, expect, it } from "vitest";
import {
  expandableIds,
  isFullyExpanded,
  nodeNet,
  parseFluxNodes,
  rootNodes,
  singleSidedLabel,
  visibleRows,
  type FluxNode,
} from "../hierarchy";

const node = (over: Partial<FluxNode> & { id: string }): FluxNode => ({
  parentId: null,
  label: over.id,
  avgEmissions: null,
  avgRemovals: null,
  ...over,
});

/** A miniature of the design's tree: root → 2 branches → leaves. */
const TREE: FluxNode[] = [
  node({ id: "all", label: "All land", avgEmissions: 1600, avgRemovals: -750 }),
  node({
    id: "land",
    parentId: "all",
    label: "Land use",
    avgEmissions: 1350,
    avgRemovals: -750,
  }),
  node({
    id: "veg",
    parentId: "land",
    label: "Vegetation",
    avgEmissions: 530,
    avgRemovals: -710,
  }),
  node({ id: "loss", parentId: "veg", label: "Tree loss", avgEmissions: 400 }),
  node({ id: "gain", parentId: "veg", label: "Tree gain", avgRemovals: -560 }),
  node({
    id: "agri",
    parentId: "all",
    label: "Agriculture",
    avgEmissions: 250,
  }),
  node({
    id: "crop",
    parentId: "agri",
    label: "Crop management",
    avgEmissions: 150,
  }),
  node({
    id: "live",
    parentId: "agri",
    label: "Livestock",
    avgEmissions: 100,
  }),
];

describe("nodeNet", () => {
  it("sums the two gross figures, removals being negative", () => {
    expect(nodeNet(TREE[0])).toBe(850);
    expect(nodeNet(TREE[2])).toBe(-180);
  });

  it("treats a missing side as zero rather than poisoning the sum", () => {
    expect(nodeNet(TREE[3])).toBe(400); // emissions only
    expect(nodeNet(TREE[4])).toBe(-560); // removals only
  });

  it("returns null only when neither metric applies", () => {
    expect(nodeNet(node({ id: "x" }))).toBeNull();
  });
});

describe("singleSidedLabel", () => {
  it("names the side a node actually has", () => {
    expect(singleSidedLabel(TREE[3])).toBe("emissions only");
    expect(singleSidedLabel(TREE[4])).toBe("removals only");
  });

  it("is null when both sides are present or both absent", () => {
    expect(singleSidedLabel(TREE[0])).toBeNull();
    expect(singleSidedLabel(node({ id: "x" }))).toBeNull();
  });
});

describe("visibleRows", () => {
  it("shows only the root when nothing is expanded", () => {
    const rows = visibleRows(TREE, new Set());
    expect(rows.map((r) => r.node.id)).toEqual(["all"]);
    expect(rows[0]).toMatchObject({ depth: 0, hasChildren: true });
  });

  it("reveals one level per expanded ancestor", () => {
    expect(visibleRows(TREE, new Set(["all"])).map((r) => r.node.id)).toEqual([
      "all",
      "land",
      "agri",
    ]);
    expect(
      visibleRows(TREE, new Set(["all", "land"])).map((r) => r.node.id)
    ).toEqual(["all", "land", "veg", "agri"]);
  });

  it("hides a subtree whose ancestor is collapsed even if it is expanded", () => {
    // "veg" is expanded but "land" is not, so its leaves stay hidden.
    const rows = visibleRows(TREE, new Set(["all", "veg"]));
    expect(rows.map((r) => r.node.id)).toEqual(["all", "land", "agri"]);
  });

  it("reports depth and computes each row's net", () => {
    const rows = visibleRows(TREE, new Set(expandableIds(TREE)));
    const byId = Object.fromEntries(rows.map((r) => [r.node.id, r]));
    expect(byId.all.depth).toBe(0);
    expect(byId.land.depth).toBe(1);
    expect(byId.veg.depth).toBe(2);
    expect(byId.loss.depth).toBe(3);
    expect(byId.loss.hasChildren).toBe(false);
    expect(byId.veg.net).toBe(-180);
  });

  it("preserves the order the API sent within a level", () => {
    const rows = visibleRows(TREE, new Set(["all"]));
    expect(rows.map((r) => r.node.id)).toEqual(["all", "land", "agri"]);
  });
});

describe("expandableIds / isFullyExpanded", () => {
  it("lists only nodes that have children", () => {
    expect(expandableIds(TREE).sort()).toEqual(["agri", "all", "land", "veg"]);
  });

  it("is fully expanded only once every parent is open", () => {
    expect(isFullyExpanded(TREE, new Set(expandableIds(TREE)))).toBe(true);
    expect(isFullyExpanded(TREE, new Set(["all", "land"]))).toBe(false);
  });
});

describe("parseFluxNodes", () => {
  it("maps the backend's snake_case rows onto the domain shape", () => {
    const parsed = parseFluxNodes([
      {
        id: "soil",
        parent_id: "land_use",
        label: "Soil",
        avg_emissions: 820,
        avg_removals: -40,
      },
    ]);
    expect(parsed).toEqual([
      {
        id: "soil",
        parentId: "land_use",
        label: "Soil",
        avgEmissions: 820,
        avgRemovals: -40,
      },
    ]);
  });

  it("normalises a null parent to a root and keeps null metrics null", () => {
    const [root] = parseFluxNodes([
      { id: "all_land", parent_id: null, label: "All land", avg_emissions: 10 },
    ]);
    expect(root.parentId).toBeNull();
    expect(root.avgRemovals).toBeNull();
    expect(rootNodes([root])).toHaveLength(1);
  });

  it("skips rows with no usable id, and non-array input", () => {
    expect(parseFluxNodes([{ label: "orphan" }, null, 7])).toEqual([]);
    expect(parseFluxNodes(undefined)).toEqual([]);
    expect(parseFluxNodes({})).toEqual([]);
  });

  it("falls back to the id when a label is missing", () => {
    expect(parseFluxNodes([{ id: "mineral_soil" }])[0].label).toBe(
      "mineral_soil"
    );
  });
});
