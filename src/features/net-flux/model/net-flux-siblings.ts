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
 * The detail wording for a widget. Reads `backendTitle` first: `useAnalysis`
 * overwrites `title` with one "{dataset} in {location}" string shared by every
 * chart of the analysis, which would make all three roll-ups read alike.
 */
export function netFluxWidgetDetailLabel(widget: InsightWidget): string {
  return netFluxDetailLabel(widget.backendTitle ?? widget.title);
}

interface DetailLevel {
  /** As `netFluxDetailLabel` reads it off the backend title. */
  label: string;
  /** The DETAIL pill's option: the design prints "Full" against a caption of "· Full detail". */
  pill: string;
  /** The roll-up a group opens on. */
  isDefault?: boolean;
}

/**
 * The three roll-ups `LGMSChartGenerator` returns, in the DETAIL pill's
 * display order. Category is the default because it shows what drives the
 * flux at a glance, where Full detail's eleven series are too dense a first
 * read — so the default is a flag here rather than "first in order".
 */
const DETAIL_LEVELS: readonly DetailLevel[] = [
  { label: "Summary", pill: "Summary" },
  { label: "Category", pill: "Category", isDefault: true },
  { label: "Full detail", pill: "Full" },
];

function detailLevelOf(label: string): DetailLevel | undefined {
  return DETAIL_LEVELS.find((level) => level.label === label);
}

/** Position in display order; unrecognised labels sort last, in backend order. */
function detailRank(widget: InsightWidget): number {
  const level = detailLevelOf(netFluxWidgetDetailLabel(widget));
  return level ? DETAIL_LEVELS.indexOf(level) : DETAIL_LEVELS.length;
}

function orderSiblings(group: InsightWidget[]): InsightWidget[] {
  return [...group].sort((a, b) => detailRank(a) - detailRank(b));
}

/**
 * The roll-up a group opens on: the default level if present, else the first
 * in display order. Order-independent, so callers needn't sort first.
 */
export function defaultNetFluxSibling(
  siblings: InsightWidget[]
): InsightWidget | undefined {
  return (
    siblings.find(
      (w) => detailLevelOf(netFluxWidgetDetailLabel(w))?.isDefault
    ) ?? orderSiblings(siblings)[0]
  );
}

/** Every chart sharing this widget's group, in display order. */
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
 * entry — the sibling currently selected by its DETAIL pill, defaulting to
 * the Category roll-up.
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
    out.push(
      group.find((w) => w.id === selectedId) ??
        defaultNetFluxSibling(group) ??
        widget
    );
  }

  return out;
}

export function netFluxWidgetDetailPillLabel(widget: InsightWidget): string {
  const label = netFluxWidgetDetailLabel(widget);
  return detailLevelOf(label)?.pill ?? label;
}

/**
 * The net-flux roll-ups among the charts of ONE analysis, default detail
 * first (`orderSiblings`).
 *
 * The sibling functions above group by `chartBatchKey`, which only parses the
 * `{insightId}-chart-{n}` ids `RestAnalysisGateway` mints. Dashboard widgets
 * and stored insights carry the backend chart UUID instead, so grouping is
 * unavailable there — but those callers already hold exactly one analysis's
 * charts, which makes the grouping step unnecessary rather than impossible.
 */
export function netFluxRollups(cards: InsightWidget[]): InsightWidget[] {
  return orderSiblings(cards.filter(isNetFluxWidget));
}

/**
 * One analysis's charts with its net-flux roll-ups folded to a single entry —
 * `selectedId` when it names one of them, else the lead roll-up. The folded
 * entry keeps the position of the first roll-up, so the reading order the
 * backend chose survives.
 *
 * The grouping-free counterpart of `collapseNetFluxSiblings`; see
 * `netFluxRollups` for why both exist.
 */
export function collapseNetFluxRollups(
  cards: InsightWidget[],
  selectedId?: string
): InsightWidget[] {
  const rollups = netFluxRollups(cards);
  if (rollups.length < 2) return cards;
  const selected = rollups.find((w) => w.id === selectedId) ?? rollups[0];

  let placed = false;
  const out: InsightWidget[] = [];
  for (const card of cards) {
    if (!isNetFluxWidget(card)) {
      out.push(card);
      continue;
    }
    if (placed) continue;
    placed = true;
    out.push(selected);
  }
  return out;
}
