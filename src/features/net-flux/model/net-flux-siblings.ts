import { chartBatchKey } from "@/src/entities/insight";
import type { InsightWidget } from "@/app/types/chat";
import { isNetFluxWidget } from "./net-flux-variants";

/**
 * The three LGMS time-series charts arrive as separate charts of one analysis,
 * grouped by `chartBatchKey`'s `{insightId}-chart-{n}` id prefix. That shared
 * prefix ties the Full detail / Category / Summary roll-ups together without
 * the frontend having to match on titles.
 *
 * Returns null when the widget isn't one of these charts, or when its id
 * doesn't follow that shape (an insight rehydrated from history, say) — in
 * which case it simply has no siblings and behaves as its own entry.
 */
export function netFluxGroupKey(widget: InsightWidget): string | null {
  if (!isNetFluxWidget(widget)) return null;
  return chartBatchKey(widget.id);
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

/**
 * The roll-up a group opens on, and the first DETAIL option. The backend sends
 * Full detail first, but eleven series is too dense a first read; Category
 * shows what drives the flux at a glance, so it leads and Full/Summary follow
 * in the order the backend sent them.
 */
const DEFAULT_DETAIL_LABEL = "Category";

/** The default detail first, then the rest in the order the backend sent. */
function orderSiblings(group: InsightWidget[]): InsightWidget[] {
  const lead = group.findIndex(
    (w) => netFluxWidgetDetailLabel(w) === DEFAULT_DETAIL_LABEL
  );
  if (lead <= 0) return group;
  return [group[lead], ...group.slice(0, lead), ...group.slice(lead + 1)];
}

/** Every chart sharing this widget's group, default detail first. */
export function netFluxSiblings(
  insights: InsightWidget[],
  widget: InsightWidget
): InsightWidget[] {
  const key = netFluxGroupKey(widget);
  if (!key) return [widget];
  const group = insights.filter((w) => netFluxGroupKey(w) === key);
  return group.length > 0 ? orderSiblings(group) : [widget];
}

/**
 * The workspace's pager list with each net-flux group folded to a single
 * entry — the sibling currently selected by its DETAIL pill, defaulting to the
 * group's lead roll-up (Category, per `orderSiblings`).
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

    const group = orderSiblings(
      insights.filter((w) => netFluxGroupKey(w) === key)
    );
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
