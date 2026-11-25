import { describe, expect, it } from "vitest";
import { boundingBox, previewCrop } from "../thumbnail";

// A 109.8 km Sentinel-2 tile in UTM metres.
const tile: [number, number, number, number] = [
  499980, 8790220, 609780, 8900020,
];

describe("previewCrop", () => {
  it("zooms in on a small area, centred, with a margin", () => {
    // A 10 km square in the tile's centre.
    const crop = previewCrop(tile, [549880, 8840120, 559880, 8850120])!;
    expect(crop.scale).toBeCloseTo(109800 / 11000, 5);
    // The crop's left edge is 49.4 km into the tile: -4.49 box widths.
    expect(crop.left).toBeCloseTo(-(549380 - 499980) / 11000, 5);
    expect(crop.top).toBeCloseTo(-(8900020 - 8850620) / 11000, 5);
  });

  it("keeps the crop inside the tile", () => {
    // An area at the tile's west edge.
    const crop = previewCrop(tile, [499980, 8840000, 505000, 8845000])!;
    expect(crop.left).toBeCloseTo(0);
  });

  it("never zooms out past the whole tile", () => {
    const crop = previewCrop(tile, [400000, 8700000, 700000, 9000000])!;
    expect(crop.scale).toBe(1);
  });

  it("is null when the area is outside the tile", () => {
    expect(previewCrop(tile, [0, 0, 1000, 1000])).toBeNull();
  });
});

describe("boundingBox", () => {
  it("bounds projected points", () => {
    expect(
      boundingBox([
        [3, 4],
        [1, 8],
        [5, 2],
      ])
    ).toEqual([1, 2, 5, 8]);
  });
});
