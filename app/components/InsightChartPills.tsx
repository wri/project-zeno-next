import {
  GhgFluxMeasurePill,
  isFluxTreeWidget,
} from "@/src/features/ghg-flux-tree";
import { isNetFluxWidget, NetFluxToolbar } from "@/src/features/net-flux";
import type { InsightWidget } from "@/app/types/chat";

/** Whether this widget has any pills — a shell can skip its toolbar frame. */
export function hasChartPills(widget: InsightWidget): boolean {
  return isNetFluxWidget(widget) || isFluxTreeWidget(widget);
}

/**
 * The DETAIL / MEASURE pills an LGMS chart carries, for whichever of the two
 * curated LGMS charts this widget is — and nothing at all for any other chart.
 *
 * The design places these above the widget card, so each surface that pages
 * through an analysis renders them on its own shell: `InsightWorkspace` on the
 * map, `DashboardInsightModule` on a dashboard, `InsightGroupDetail` in the
 * Analyses pane. `WidgetMessage` falls back to rendering them inline when its
 * host has no shell of its own (/chart-debug).
 *
 * `siblings`/`groupKey` are the net-flux roll-ups to choose between; a surface
 * whose chart ids don't carry the `{insightId}-chart-{n}` shape must pass them
 * (see `netFluxRollups`).
 */
export default function InsightChartPills({
  widget,
  siblings,
  groupKey,
  showDivider = false,
}: {
  widget: InsightWidget;
  siblings?: InsightWidget[];
  groupKey?: string;
  showDivider?: boolean;
}) {
  if (isNetFluxWidget(widget)) {
    return (
      <NetFluxToolbar
        widget={widget}
        siblings={siblings}
        groupKey={groupKey}
        showDivider={showDivider}
      />
    );
  }
  if (isFluxTreeWidget(widget)) {
    return <GhgFluxMeasurePill widget={widget} showDivider={showDivider} />;
  }
  return null;
}
