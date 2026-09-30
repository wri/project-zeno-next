import { PINNED_HEADER_TOP_OFFSET_PX } from "../hooks/usePinnedHeader";

// The global nav plus the condensed header that pins under it once the page
// scrolls (DashboardPinnedHeader is 104px tall), and a gutter below that.
const SCROLL_OFFSET_PX = PINNED_HEADER_TOP_OFFSET_PX + 104 + 16;
const MAX_FRAMES = 60;

/**
 * Scrolls a section the footer just added into view. A new section is
 * appended after the last one, which is above the footer and so usually above
 * the viewport too. The panel may not be rendered yet (the cache has just
 * changed, and on an empty dashboard the grid is only now replacing the
 * hero), so this waits up to a second of frames for it. It looks the panel up
 * in the DOM rather than going through React state, because the component
 * that asked can itself unmount when the page swaps hero for grid.
 */
export function scrollToSectionWhenRendered(sectionId: string): void {
  let frames = 0;
  const tick = () => {
    const panel = document.querySelector<HTMLElement>(
      `[data-section-id="${sectionId}"]`
    );
    if (panel) {
      window.scrollTo({
        top:
          panel.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX,
        behavior: "smooth",
      });
      return;
    }
    frames += 1;
    if (frames < MAX_FRAMES) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
