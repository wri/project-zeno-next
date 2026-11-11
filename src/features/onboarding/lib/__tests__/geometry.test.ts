import { describe, expect, it } from "vitest";

import {
  clipToViewport,
  dockPlacement,
  intersectRect,
  padRect,
  placePopover,
  pointInRect,
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

  describe("pointing at a control inside the target (pointAt)", () => {
    // A tall panel on the left; its search box near the top.
    const panel = { x: 20, y: 40, width: 300, height: 700 };
    const search = { x: 30, y: 60, width: 280, height: 30 };

    it("stays beside the whole target, lined up with the control", () => {
      const p = placePopover(panel, POPOVER, VIEWPORT, "right", search);
      expect(p.side).toBe("right");
      expect(p.x).toBe(20 + 300 + 14);
      // As high as the margin allows, and the arrow on the search box.
      expect(p.y).toBe(12);
      expect(p.y + p.arrowOffset).toBe(75);
    });

    it("points at the target's middle without one, as before", () => {
      const without = placePopover(panel, POPOVER, VIEWPORT, "right");
      expect(without).toEqual(
        placePopover(panel, POPOVER, VIEWPORT, "right", null)
      );
      expect(without.y + without.arrowOffset).toBe(40 + 350);
    });

    it("lines up along the other axis when it sits above or below", () => {
      const bar = { x: 0, y: 600, width: 1000, height: 60 };
      const button = { x: 800, y: 610, width: 40, height: 40 };
      const p = placePopover(bar, POPOVER, VIEWPORT, "top", button);
      expect(p.side).toBe("top");
      expect(p.x + p.arrowOffset).toBe(820);
    });
  });
});

describe("intersectRect", () => {
  it("gives the shared part", () => {
    expect(
      intersectRect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: 80, width: 100, height: 100 }
      )
    ).toEqual({ x: 50, y: 80, width: 50, height: 20 });
  });

  it("is null when the rects only touch or do not meet", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    expect(intersectRect(a, { x: 100, y: 0, width: 10, height: 10 })).toBe(
      null
    );
    expect(intersectRect(a, { x: 300, y: 300, width: 10, height: 10 })).toBe(
      null
    );
  });
});

describe("pointInRect", () => {
  const rect = { x: 100, y: 200, width: 50, height: 20 };

  it("counts the edges as inside", () => {
    expect(pointInRect({ x: 100, y: 200 }, rect)).toBe(true);
    expect(pointInRect({ x: 150, y: 220 }, rect)).toBe(true);
    expect(pointInRect({ x: 120, y: 210 }, rect)).toBe(true);
  });

  it("is outside past any edge, and with no rect", () => {
    expect(pointInRect({ x: 99, y: 210 }, rect)).toBe(false);
    expect(pointInRect({ x: 151, y: 210 }, rect)).toBe(false);
    expect(pointInRect({ x: 120, y: 199 }, rect)).toBe(false);
    expect(pointInRect({ x: 120, y: 221 }, rect)).toBe(false);
    expect(pointInRect({ x: 120, y: 210 }, null)).toBe(false);
  });
});

describe("dockPlacement", () => {
  const corner = (hole: Parameters<typeof dockPlacement>[0]) => {
    const { x, y } = dockPlacement(hole, POPOVER, VIEWPORT);
    return `${y < VIEWPORT.height / 2 ? "top" : "bottom"}-${x < VIEWPORT.width / 2 ? "left" : "right"}`;
  };

  it("docks bottom-right, inside the margin, with no arrow", () => {
    expect(dockPlacement(null, POPOVER, VIEWPORT)).toEqual({
      x: 1000 - 300 - 12,
      y: 800 - 200 - 12,
      side: null,
      arrowOffset: 0,
    });
  });

  it("takes the next corner clear of the cut-out, in order", () => {
    // The map's chart card, top-right: bottom-right is clear.
    expect(corner({ x: 600, y: 20, width: 380, height: 300 })).toBe(
      "bottom-right"
    );
    // A panel down the right side: bottom-left.
    expect(corner({ x: 600, y: 0, width: 400, height: 800 })).toBe(
      "bottom-left"
    );
    // A strip along the bottom: top-right.
    expect(corner({ x: 0, y: 500, width: 1000, height: 300 })).toBe(
      "top-right"
    );
    // The first clear corner wins, even when a later one is clear too.
    expect(corner({ x: 680, y: 580, width: 50, height: 50 })).toBe(
      "bottom-left"
    );
  });

  it("takes the corner that covers least of the cut-out when none is clear", () => {
    // Everything but a strip along the top and the left.
    expect(corner({ x: 100, y: 100, width: 900, height: 700 })).toBe(
      "top-left"
    );
    // The whole window: all corners cover as much, so the first one.
    expect(corner({ x: 0, y: 0, width: 1000, height: 800 })).toBe(
      "bottom-right"
    );
  });

  it("stays inside the margin when the popover is wider than the window", () => {
    const p = dockPlacement(null, { width: 2000, height: 900 }, VIEWPORT);
    expect([p.x, p.y]).toEqual([12, 12]);
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
