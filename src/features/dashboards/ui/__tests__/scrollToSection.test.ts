// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scrollTarget, scrollToWidgetWhenRendered } from "../scrollToSection";

/** A widget cell inside a section panel, as the grid renders them. */
function sectionWithCell() {
  document.body.innerHTML =
    '<div data-section-id="s1"><div data-widget-id="w1"></div></div>';
  return {
    section: document.querySelector<HTMLElement>('[data-section-id="s1"]')!,
    cell: document.querySelector<HTMLElement>('[data-widget-id="w1"]')!,
  };
}

/** Stubs layout: a laid-out element has one client rect, a hidden one none. */
function layOut(el: HTMLElement, top: number | null) {
  vi.spyOn(el, "getClientRects").mockReturnValue(
    (top === null ? [] : [{}]) as unknown as DOMRectList
  );
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: top ?? 0,
    bottom: top ?? 0,
  } as DOMRect);
}

describe("scrollTarget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("aims at the widget's cell when it is laid out", () => {
    const { cell, section } = sectionWithCell();
    layOut(cell, 600);
    layOut(section, 500);

    expect(scrollTarget(cell)).toBe(cell);
  });

  it("aims at the section around a widget that has no layout (a collapsed section)", () => {
    const { cell, section } = sectionWithCell();
    layOut(cell, null);
    layOut(section, 500);

    expect(scrollTarget(cell)).toBe(section);
  });
});

describe("scrollToWidgetWhenRendered", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (tick: FrameRequestCallback) => {
      tick(0);
      return 0;
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("scrolls the collapsed section under the condensed header", () => {
    const { cell, section } = sectionWithCell();
    layOut(cell, null);
    layOut(section, 500);

    scrollToWidgetWhenRendered("w1");

    // The section's top (500), less the header's offset (no pinned header in
    // the DOM, so its 40px constant) and the 16px gutter.
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 444,
      behavior: "smooth",
    });
  });
});
