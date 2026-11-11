import { describe, expect, it } from "vitest";

import {
  clipToViewport,
  padRect,
  placePopover,
  rectFromPoints,
  sameRect,
  veilClipPath,
} from "../geometry";

const VIEWPORT = { width: 1000, height: 800 };
const POPOVER = { width: 300, height: 200 };

describe("padRect", () => {
  it("grows the rect on every side", () => {
    expect(padRect({ x: 10, y: 20, width: 30, height: 40 }, 5)).toEqual({
      x: 5,
      y: 15,
      width: 40,
      height: 50,
    });
  });
});

describe("clipToViewport", () => {
  it("clips a rect that hangs off the edge", () => {
    expect(
      clipToViewport({ x: -20, y: 700, width: 100, height: 200 }, VIEWPORT)
    ).toEqual({ x: 0, y: 700, width: 80, height: 100 });
  });

  it("returns null when the rect is fully off screen", () => {
    expect(
      clipToViewport({ x: 1200, y: 0, width: 50, height: 50 }, VIEWPORT)
    ).toBeNull();
  });
});

describe("rectFromPoints", () => {
  it("normalises corners given in any order", () => {
    expect(rectFromPoints({ x: 50, y: 10 }, { x: 10, y: 60 })).toEqual({
      x: 10,
      y: 10,
      width: 40,
      height: 50,
    });
  });
});

describe("veilClipPath", () => {
  const points = (clip: string) =>
    clip.replace(/^polygon\(evenodd, |\)$/g, "").split(", ");

  it("cuts the hole out of the full viewport with the even-odd rule", () => {
    const clip = veilClipPath(
      { x: 100, y: 200, width: 300, height: 100 },
      VIEWPORT
    );
    expect(clip.startsWith("polygon(evenodd, ")).toBe(true);
    expect(points(clip)).toEqual([
      "0px 0px",
      "1000px 0px",
      "1000px 800px",
      "0px 800px",
      "0px 0px",
      "100px 200px",
      "100px 300px",
      "400px 300px",
      "400px 200px",
      "100px 200px",
    ]);
  });

  it("collapses the hole to the centre when there is no target", () => {
    expect(points(veilClipPath(null, VIEWPORT)).slice(5)).toEqual(
      Array(5).fill("500px 400px")
    );
  });

  it("keeps the same point count so steps animate into each other", () => {
    const a = points(veilClipPath(null, VIEWPORT));
    const b = points(
      veilClipPath({ x: 1, y: 2, width: 3, height: 4 }, VIEWPORT)
    );
    expect(a).toHaveLength(10);
    expect(b).toHaveLength(10);
  });
});

describe("placePopover", () => {
  it("centres the popover when there is no target", () => {
    const p = placePopover(null, POPOVER, VIEWPORT);
    expect(p).toMatchObject({ x: 350, y: 300, side: null });
  });

  it("uses the preferred side when it fits", () => {
    const target = { x: 100, y: 300, width: 100, height: 50 };
    const p = placePopover(target, POPOVER, VIEWPORT, "right");
    expect(p.side).toBe("right");
    expect(p.x).toBe(214);
  });

  it("falls back to another side when the preferred one overflows", () => {
    const target = { x: 850, y: 300, width: 100, height: 50 };
    const p = placePopover(target, POPOVER, VIEWPORT, "right");
    expect(p.side).toBe("bottom");
  });

  it("keeps the popover inside the viewport", () => {
    const target = { x: 0, y: 0, width: 40, height: 40 };
    const p = placePopover(target, POPOVER, VIEWPORT, "bottom");
    expect(p.x).toBeGreaterThanOrEqual(12);
    expect(p.y + POPOVER.height).toBeLessThanOrEqual(VIEWPORT.height - 12);
  });

  it("points the arrow at the target centre", () => {
    const target = { x: 100, y: 300, width: 100, height: 50 };
    const p = placePopover(target, POPOVER, VIEWPORT, "right");
    expect(p.y + p.arrowOffset).toBe(325);
  });

  it("centres when nothing fits around a huge target", () => {
    const target = { x: 0, y: 0, width: 1000, height: 800 };
    expect(placePopover(target, POPOVER, VIEWPORT).side).toBeNull();
  });
});

describe("sameRect", () => {
  it("treats sub-pixel jitter as equal", () => {
    expect(
      sameRect(
        { x: 10.2, y: 5, width: 20, height: 20 },
        { x: 9.9, y: 5.1, width: 20, height: 20 }
      )
    ).toBe(true);
  });

  it("handles nulls", () => {
    expect(sameRect(null, null)).toBe(true);
    expect(sameRect(null, { x: 0, y: 0, width: 1, height: 1 })).toBe(false);
  });
});
