import { describe, expect, it } from "vitest";
import {
  forbiddenLayerDirection,
  forbiddenSameLayer,
  SLICE_LAYERS,
} from "./dependency-cruiser.config";
import { EDGE_ALLOWLIST } from "./fsd-allowlist";
import { applyAllowList, findCycles, toSliceGraph } from "./fsd-check";

describe("fsd-check helpers", () => {
  it("findCycles returns one sorted cluster per cycle and ignores self-edges and DAGs", () => {
    const graph = new Map([
      ["b", ["c"]],
      ["c", ["a"]],
      ["a", ["b", "a"]],
      ["d", ["a"]],
    ]);
    expect(findCycles(graph)).toEqual([["a", "b", "c"]]);
  });

  it("toSliceGraph collapses files to slices and drops intra-slice and non-slice edges", () => {
    const graph = new Map([
      ["src/features/a/x.ts", ["src/features/a/y.ts", "src/features/b/z.ts"]],
      ["src/shared/s.ts", ["src/features/a/x.ts"]],
    ]);
    expect(toSliceGraph(graph)).toEqual(
      new Map([["src/features/a", ["src/features/b"]]])
    );
  });

  it("applyAllowList reports both new and stale entries", () => {
    expect(applyAllowList([1, 2], [2, 3], String)).toEqual({
      unexpected: [1],
      stale: [3],
    });
  });

  it("every allow-listed edge cites a rule that some test runs", () => {
    const known = new Set(
      [
        ...forbiddenLayerDirection(),
        ...SLICE_LAYERS.flatMap((l) => forbiddenSameLayer(`src/${l}`)),
      ].map((r) => r.name)
    );
    expect(EDGE_ALLOWLIST.filter((a) => !known.has(a.rule))).toEqual([]);
  });
});
