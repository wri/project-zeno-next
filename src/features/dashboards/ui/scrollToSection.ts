import { PINNED_HEADER_TOP_OFFSET_PX } from "../hooks/usePinnedHeader";
import { PINNED_HEADER_ATTR } from "./DashboardPinnedHeader";

// Space left between the condensed header and the panel scrolled under it.
const GUTTER_PX = 16;
const MAX_FRAMES = 60;

/**
 * Scrolls an element of the dashboard into view once `find` returns it. The
 * element may not be rendered yet (the cache has just changed, and on an
 * empty dashboard the grid is only now replacing the hero), so this waits up
 * to a second of frames for it.
 *
 * The element lands below the condensed header, which is fixed at the top
 * once the page scrolls. The header is measured rather than summed from
 * constants: it stays laid out while hidden, and its height is the breadcrumb
 * plus bar.
 */
function scrollToWhenRendered(find: () => HTMLElement | null): void {
  let frames = 0;
  const tick = () => {
    const target = find();
    if (target) {
      const header = document.querySelector(`[${PINNED_HEADER_ATTR}]`);
      const headerBottom =
        header?.getBoundingClientRect().bottom ?? PINNED_HEADER_TOP_OFFSET_PX;
      window.scrollTo({
        top:
          target.getBoundingClientRect().top +
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

/**
 * Scrolls a section just added to the dashboard into view. A new section is
 * appended after the last one, which is above the footer and so usually above
 * the viewport too.
 */
export function scrollToSectionWhenRendered(sectionId: string): void {
  scrollToWhenRendered(() =>
    document.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`)
  );
}

/**
 * Where to scroll for a widget's grid cell: the cell itself, or, when it has
 * no layout (its section is collapsed, which hides the section's widgets),
 * the section around it, so the scroll never aims at a zero-sized box.
 */
export function scrollTarget(cell: HTMLElement): HTMLElement {
  if (cell.getClientRects().length > 0) return cell;
  return cell.closest<HTMLElement>("[data-section-id]") ?? cell;
}

/** Scrolls a widget on the dashboard into view, or its collapsed section. */
export function scrollToWidgetWhenRendered(widgetId: string): void {
  scrollToWhenRendered(() => {
    const cell = document.querySelector<HTMLElement>(
      `[data-widget-id="${widgetId}"]`
    );
    return cell && scrollTarget(cell);
  });
}
