// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingTooltip } from "../FloatingTooltip";

const PANEL = { width: 200, height: 70 };
const VIEWPORT = { width: 1000, height: 800 };

// happy-dom has no layout engine, so the measurements the frame reads are stubbed.
function anchorAt(left: number, top: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left,
    top,
  } as DOMRect);
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
    PANEL.width
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(
    PANEL.height
  );
  Object.defineProperty(window, "innerWidth", {
    value: VIEWPORT.width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: VIEWPORT.height,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderTooltip(point: { x: number; y: number }) {
  const anchorRef = createRef<HTMLDivElement>();
  const { container } = render(
    <ChakraProvider value={defaultSystem}>
      <div ref={anchorRef} />
      <FloatingTooltip anchorRef={anchorRef} point={point}>
        <span>panel</span>
      </FloatingTooltip>
    </ChakraProvider>
  );
  return {
    container,
    frame: screen.getByText("panel").parentElement as HTMLElement,
  };
}

describe("FloatingTooltip", () => {
  it("renders the panel outside the chart, at the anchor's viewport position plus the chart point", () => {
    anchorAt(300, 100);
    const { container, frame } = renderTooltip({ x: -208, y: 64 });
    expect(container.contains(frame)).toBe(false);
    expect(frame.style.left).toBe("92px");
    expect(frame.style.top).toBe("164px");
  });

  it("re-places the panel when the page scrolls", () => {
    anchorAt(300, 100);
    const { frame } = renderTooltip({ x: 0, y: 0 });
    expect(frame.style.top).toBe("100px");

    // The card scrolled: the chart now sits higher in the viewport.
    anchorAt(300, 40);
    fireEvent.scroll(window);
    expect(frame.style.top).toBe("40px");
  });
});
