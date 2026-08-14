import { describe, it, expect } from "vitest";

import { packCells } from "../packing";

/** Convenience: pack an array of "s" (single) / "d" (double) markers. */
function pack(sizes: ("s" | "d")[]) {
  return packCells(sizes, (size) => size === "d");
}

describe("packCells", () => {
  it("returns no segments for no cells", () => {
    expect(pack([])).toEqual([]);
  });

  it("puts a lone half-width cell in the left column, right stays open", () => {
    expect(pack(["s"])).toEqual([
      { kind: "columns", left: [{ item: "s", index: 0 }], right: [] },
    ]);
  });

  it("pairs two adjacent half-width cells side by side", () => {
    expect(pack(["s", "s"])).toEqual([
      {
        kind: "columns",
        left: [{ item: "s", index: 0 }],
        right: [{ item: "s", index: 1 }],
      },
    ]);
  });

  it("alternates a run of half-width cells so columns pack vertically", () => {
    const [segment] = pack(["s", "s", "s", "s", "s"]);
    expect(segment).toEqual({
      kind: "columns",
      left: [
        { item: "s", index: 0 },
        { item: "s", index: 2 },
        { item: "s", index: 4 },
      ],
      right: [
        { item: "s", index: 1 },
        { item: "s", index: 3 },
      ],
    });
  });

  it("gives a full-width cell its own segment", () => {
    expect(pack(["d"])).toEqual([
      { kind: "full", cell: { item: "d", index: 0 } },
    ]);
  });

  it("splits half-width runs at each full-width cell", () => {
    expect(pack(["s", "d", "s", "s"])).toEqual([
      { kind: "columns", left: [{ item: "s", index: 0 }], right: [] },
      { kind: "full", cell: { item: "d", index: 1 } },
      {
        kind: "columns",
        left: [{ item: "s", index: 2 }],
        right: [{ item: "s", index: 3 }],
      },
    ]);
  });

  it("keeps original indices so drag-and-drop still maps to the flat list", () => {
    const segments = pack(["d", "s", "s", "s", "d", "s"]);
    expect(segments).toEqual([
      { kind: "full", cell: { item: "d", index: 0 } },
      {
        kind: "columns",
        left: [
          { item: "s", index: 1 },
          { item: "s", index: 3 },
        ],
        right: [{ item: "s", index: 2 }],
      },
      { kind: "full", cell: { item: "d", index: 4 } },
      { kind: "columns", left: [{ item: "s", index: 5 }], right: [] },
    ]);
  });

  it("passes the index to the isFullWidth predicate", () => {
    const seen: number[] = [];
    packCells(["a", "b"], (_item, index) => {
      seen.push(index);
      return false;
    });
    expect(seen).toEqual([0, 1]);
  });

  it("does not mutate the input array", () => {
    const input: ("s" | "d")[] = ["s", "d", "s"];
    pack(input);
    expect(input).toEqual(["s", "d", "s"]);
  });
});
