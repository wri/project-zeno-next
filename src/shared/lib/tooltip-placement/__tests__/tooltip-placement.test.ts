import { describe, expect, it } from "vitest";

import { clampToViewport, VIEWPORT_MARGIN } from "../tooltip-placement";

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 70 };

describe("clampToViewport", () => {
  it("leaves a panel that already fits where it is", () => {
    expect(clampToViewport({ left: 92, top: 164, ...size }, viewport)).toEqual({
      left: 92,
      top: 164,
    });
  });

  it("pulls a panel past the bottom edge back up (a last-row tooltip)", () => {
    const placed = clampToViewport({ left: 300, top: 760, ...size }, viewport);
    expect(placed).toEqual({
      left: 300,
      top: viewport.height - size.height - VIEWPORT_MARGIN,
    });
  });

  it("pulls a panel past the left edge back in (a narrow label column)", () => {
    const placed = clampToViewport({ left: -108, top: 100, ...size }, viewport);
    expect(placed).toEqual({ left: VIEWPORT_MARGIN, top: 100 });
  });

  it("keeps the panel inside the right and top edges", () => {
    const placed = clampToViewport({ left: 950, top: -30, ...size }, viewport);
    expect(placed).toEqual({
      left: viewport.width - size.width - VIEWPORT_MARGIN,
      top: VIEWPORT_MARGIN,
    });
  });

  it("pins the leading edge when the panel is larger than the viewport", () => {
    const placed = clampToViewport(
      { left: 400, top: 300, width: 2000, height: 70 },
      viewport
    );
    expect(placed.left).toBe(VIEWPORT_MARGIN);
  });
});
