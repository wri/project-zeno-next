"use client";

import { useEffect, useState } from "react";

/** Height of the sticky global nav (`PageHeader`) the header pins beneath. */
export const PINNED_HEADER_TOP_OFFSET_PX = 40;

/**
 * Tracks whether the in-page dashboard header has scrolled out of view behind
 * the global nav, which is when the fixed condensed header takes over.
 *
 * Attach `sentinelRef` to the full header's wrapper. `pinned` flips to true
 * only once that element is completely hidden above the viewport (offset by
 * the nav height), so a short page that never scrolls never pins — and flips
 * back as soon as the full header re-enters view.
 */
export default function usePinnedHeader(
  topOffsetPx: number = PINNED_HEADER_TOP_OFFSET_PX
) {
  // Callback-ref-into-state so the observer attaches when the header mounts
  // (it renders only after the dashboard query resolves), not just on the
  // page's first render.
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!sentinel || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        // Not intersecting AND above the nav line → scrolled past it. (An
        // element can also stop intersecting below the viewport; that must
        // not pin, hence the direction check.)
        setPinned(
          !entry.isIntersecting && entry.boundingClientRect.top < topOffsetPx
        );
      },
      { rootMargin: `-${topOffsetPx}px 0px 0px 0px` }
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      setPinned(false);
    };
  }, [sentinel, topOffsetPx]);

  return { sentinelRef: setSentinel, pinned };
}
