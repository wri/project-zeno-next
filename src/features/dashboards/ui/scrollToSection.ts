import { PINNED_HEADER_TOP_OFFSET_PX } from "../hooks/usePinnedHeader";
import { PINNED_HEADER_ATTR } from "./DashboardPinnedHeader";

// Space left between the condensed header and the panel scrolled under it.
const GUTTER_PX = 16;
const MAX_FRAMES = 60;

/**
 * Scrolls a section just added to the dashboard into view. A new section is
 * appended after the last one, which is above the footer and so usually above
 * the viewport too. The panel may not be rendered yet (the cache has just
 * changed, and on an empty dashboard the grid is only now replacing the
 * hero), so this waits up to a second of frames for it.
 *
 * The panel lands below the condensed header, which is fixed at the top once
 * the page scrolls. The header is measured rather than summed from constants:
 * it stays laid out while hidden, and its height is the breadcrumb plus bar.
 */
export function scrollToSectionWhenRendered(sectionId: string): void {
  let frames = 0;
  const tick = () => {
    const panel = document.querySelector<HTMLElement>(
      `[data-section-id="${sectionId}"]`
    );
    if (panel) {
      const header = document.querySelector(`[${PINNED_HEADER_ATTR}]`);
      const headerBottom =
        header?.getBoundingClientRect().bottom ?? PINNED_HEADER_TOP_OFFSET_PX;
      window.scrollTo({
        top:
          panel.getBoundingClientRect().top +
          window.scrollY -
          headerBottom -
          GUTTER_PX,
        behavior: "smooth",
      });
      return;
    }
    frames += 1;
    if (frames < MAX_FRAMES) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
