/**
 * Keeps a floating panel — a chart tooltip rendered outside its chart — fully
 * on screen. `FloatingTooltip` (`src/shared/ui`) is the consumer; its
 * docstring explains why such a panel escapes its chart in the first place.
 */

/** Gap kept between the panel and the viewport edge. */
export const VIEWPORT_MARGIN = 8;

interface PanelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The panel's top-left, moved the least distance that keeps all of it visible. */
export function clampToViewport(
  panel: PanelBox,
  viewport: { width: number; height: number }
): { left: number; top: number } {
  return {
    left: clamp(
      panel.left,
      VIEWPORT_MARGIN,
      viewport.width - panel.width - VIEWPORT_MARGIN
    ),
    top: clamp(
      panel.top,
      VIEWPORT_MARGIN,
      viewport.height - panel.height - VIEWPORT_MARGIN
    ),
  };
}

/**
 * When the range is inverted (the panel is larger than the viewport) the
 * minimum wins, so the panel's leading edge — where the heading is — stays
 * visible rather than its trailing one.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
