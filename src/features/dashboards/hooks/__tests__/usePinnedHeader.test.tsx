// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import usePinnedHeader, {
  PINNED_HEADER_TOP_OFFSET_PX,
} from "../usePinnedHeader";

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  disconnect() {
    this.disconnected = true;
  }

  unobserve() {}
  takeRecords() {
    return [];
  }
}

function Probe() {
  const { sentinelRef, pinned } = usePinnedHeader();
  return (
    <div
      ref={sentinelRef}
      data-testid="sentinel"
      data-pinned={String(pinned)}
    />
  );
}

const lastObserver = () => MockIntersectionObserver.instances.at(-1)!;

const fire = (entry: Partial<IntersectionObserverEntry>) =>
  act(() => lastObserver().callback([entry]));

const aboveNav = { top: -60 } as DOMRectReadOnly;
const belowViewport = { top: 900 } as DOMRectReadOnly;

describe("usePinnedHeader", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts unpinned and observes the sentinel offset by the nav height", () => {
    render(<Probe />);
    const sentinel = screen.getByTestId("sentinel");

    expect(sentinel.dataset.pinned).toBe("false");
    expect(lastObserver().observed).toContain(sentinel);
    expect(lastObserver().options?.rootMargin).toBe(
      `-${PINNED_HEADER_TOP_OFFSET_PX}px 0px 0px 0px`
    );
  });

  it("pins when the sentinel scrolls out above the nav and unpins on return", () => {
    render(<Probe />);
    const sentinel = screen.getByTestId("sentinel");

    fire({ isIntersecting: false, boundingClientRect: aboveNav });
    expect(sentinel.dataset.pinned).toBe("true");

    fire({ isIntersecting: true, boundingClientRect: aboveNav });
    expect(sentinel.dataset.pinned).toBe("false");
  });

  it("does not pin when the sentinel is out of view below the viewport", () => {
    render(<Probe />);

    fire({ isIntersecting: false, boundingClientRect: belowViewport });
    expect(screen.getByTestId("sentinel").dataset.pinned).toBe("false");
  });

  it("stays unpinned when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(<Probe />);

    expect(screen.getByTestId("sentinel").dataset.pinned).toBe("false");
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<Probe />);
    const observer = lastObserver();

    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
