/**
 * What a card's switch does: puts the item on the map, adds it to a dashboard,
 * or something a caller spells out in full (`on` names the state while
 * checked, `off` while unchecked — e.g. "Cancel adding X to dashboard" /
 * "Add X to dashboard").
 */
export type ToggleVerb = "map" | "dashboard" | { on: string; off: string };

/**
 * The switch's accessible name, phrased as the action flipping it will take.
 * Analytics (GTM) keys on this string together with `data-panel`, so every
 * surface derives it here instead of spelling out its own ternary.
 */
export function toggleAriaLabel(
  verb: ToggleVerb,
  title: string,
  checked: boolean
): string {
  if (verb === "map") {
    return checked ? `Hide ${title} from map` : `Show ${title} on map`;
  }
  if (verb === "dashboard") {
    return checked
      ? `Remove ${title} from dashboard`
      : `Add ${title} to dashboard`;
  }
  return checked ? verb.on : verb.off;
}
