import { describe, expect, it } from "vitest";

import { pickTooltipAnchor } from "../AreaTooltip";

const map = { width: 1000, height: 800 };
const card = { width: 264, height: 280 };

describe("pickTooltipAnchor", () => {
  it("puts the card below and to the right of the cursor by default", () => {
    expect(pickTooltipAnchor({ x: 300, y: 200 }, map, card)).toBe("top-left");
  });

  it("flips to the left near the right edge", () => {
    expect(pickTooltipAnchor({ x: 900, y: 200 }, map, card)).toBe("top-right");
  });

  it("flips above near the bottom edge", () => {
    expect(pickTooltipAnchor({ x: 300, y: 700 }, map, card)).toBe(
      "bottom-left"
    );
  });

  it("flips both ways in the bottom-right corner", () => {
    expect(pickTooltipAnchor({ x: 900, y: 700 }, map, card)).toBe(
      "bottom-right"
    );
  });
});
