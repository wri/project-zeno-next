/**
 * Geometry for one user-prompt bubble in viewport coordinates (as returned by
 * getBoundingClientRect). Arrays passed to the resolver must be in document
 * order (oldest prompt first).
 */
export interface PromptRect {
  id: string;
  top: number;
  bottom: number;
}

/** Gap between the scroll container's top edge and the pinned card. */
export const PIN_TOP_OFFSET_PX = 8;

/**
 * Height of the strip below the container's top edge where the pinned card
 * floats (top offset + max card height + breathing room). While a prompt
 * bubble is visible inside this strip it provides its own context, so the
 * card yields to it instead of covering it — this is what keeps the card
 * from duplicating or occluding a freshly sent prompt that the send handler
 * has just scroll-locked to the top of the panel.
 */
export const PIN_CONTEXT_ZONE_PX = 72;

/**
 * Pick the prompt whose turn owns the content at the top of the viewport:
 * the most recent prompt scrolled fully above the container's top edge.
 *
 * Returns null when no prompt has scrolled out yet, or when a prompt bubble
 * is visible inside the context zone (the bubble itself is the context).
 */
export function resolvePinnedPromptId(
  prompts: PromptRect[],
  containerTop: number
): string | null {
  let pinnedId: string | null = null;
  for (const prompt of prompts) {
    if (prompt.bottom <= containerTop) {
      pinnedId = prompt.id;
      continue;
    }
    if (prompt.top < containerTop + PIN_CONTEXT_ZONE_PX) return null;
    break;
  }
  return pinnedId;
}
