import type { InsightWidget } from "@/app/types/chat";
import { isNetFluxWidget } from "./net-flux-variants";

/**
 * The three LGMS time-series charts arrive as separate charts of one analysis,
 * and `RestAnalysisGateway` ids them `{insightId}-chart-{n}`. That shared
 * prefix is the group: it ties the Full detail / Category / Summary roll-ups
 * together without the frontend having to match on titles.
 *
 * Returns null when the widget isn't one of these charts, or when its id
 * doesn't follow that shape (an insight rehydrated from history, say) — in
 * which case it simply has no siblings and behaves as its own entry.
 */
export function netFluxGroupKey(widget: InsightWidget): string | null {
  if (!isNetFluxWidget(widget)) return null;
  const match = widget.id?.match(/^(.+)-chart-\d+$/);
  return match ? match[1] : null;
}

/** "Full Detail" → "Full detail": the design prints the detail in sentence case. */
function sentenceCase(label: string): string {
  return label.replace(
    /\s+(\S)/g,
    (_, first: string) => ` ${first.toLowerCase()}`
  );
}

/**
 * The detail wording for a chart, taken from the backend's own title
 * ("Net GHG Flux — Full Detail" → "Full detail", "…by Category" → "Category").
 * Falls back to the whole title so an unrecognised one still reads sensibly.
 */
export function netFluxDetailLabel(title: string): string {
  const emDash = title.split("—");
  if (emDash.length > 1) return sentenceCase(emDash[emDash.length - 1].trim());
  const by = title.match(/\bby\s+(.+)$/i);
  if (by) return by[1].trim();
  if (/\bsummary\b/i.test(title)) return "Summary";
  return title.trim();
}

/** Every chart sharing this widget's group, in the order the backend sent. */
export function netFluxSiblings(
  insights: InsightWidget[],
  widget: InsightWidget
): InsightWidget[] {
  const key = netFluxGroupKey(widget);
  if (!key) return [widget];
  const group = insights.filter((w) => netFluxGroupKey(w) === key);
  return group.length > 0 ? group : [widget];
}

/**
 * The workspace's pager list with each net-flux group folded to a single
 * entry — the sibling currently selected by its DETAIL pill, defaulting to the
 * first the backend sent (Full detail).
 *
 * Without this the three roll-ups would be three pager entries *and* three
 * DETAIL options, giving two competing ways to reach the same chart.
 */
export function collapseNetFluxSiblings(
  insights: InsightWidget[],
  selectedByGroup: Record<string, string>
): InsightWidget[] {
  const seen = new Set<string>();
  const out: InsightWidget[] = [];

  for (const widget of insights) {
    const key = netFluxGroupKey(widget);
    if (!key) {
      out.push(widget);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);

    const group = insights.filter((w) => netFluxGroupKey(w) === key);
    const selectedId = selectedByGroup[key];
    out.push(group.find((w) => w.id === selectedId) ?? group[0]);
  }

  return out;
}

/**
 * The detail wording for a widget. Reads `backendTitle` first: `useAnalysis`
 * overwrites `title` with one "{dataset} in {location}" string shared by every
 * chart of the analysis, which would make all three roll-ups read alike.
 */
export function netFluxWidgetDetailLabel(widget: InsightWidget): string {
  return netFluxDetailLabel(widget.backendTitle ?? widget.title);
}

/**
 * The DETAIL pill abbreviates where the card's caption spells out: the design's
 * pill reads "Full" against a caption of "· Full detail". Only the longest
 * option needs it, so this is a lookup rather than a rule.
 */
const PILL_ABBREVIATIONS: Record<string, string> = { "Full detail": "Full" };

export function netFluxWidgetDetailPillLabel(widget: InsightWidget): string {
  const label = netFluxWidgetDetailLabel(widget);
  return PILL_ABBREVIATIONS[label] ?? label;
}
