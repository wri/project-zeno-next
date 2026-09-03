import { describe, expect, it } from "vitest";
import { chartsToWidgets, orderInsightsForPager } from "@/src/entities/insight";
import type { Chart } from "@/src/entities/insight";
import {
  collapseNetFluxSiblings,
  isNetFluxWidget,
  netFluxWidgetDetailLabel,
} from "@/src/features/net-flux";
import { isFluxTreeWidget } from "@/src/features/ghg-flux-tree";
import type { InsightWidget } from "@/app/types/chat";

/**
 * The four charts `LGMSChartGenerator` returns for one analysis, taken from a
 * real `GET /api/insights/{id}` response (chart_data trimmed — this asserts
 * routing and pager shape, not values). Ids follow `RestAnalysisGateway`'s
 * `{insightId}-chart-{n}` scheme.
 *
 * Neither branch could render this payload alone: PZB-1247 had no
 * `hierarchical-bar` and fell chart 3 back to "bar", where its empty x_axis
 * tripped ChartWidget's axis guard. This is the regression test for that.
 */
const INSIGHT_ID = "9b2223c4-6159-45d2-b50b-3498a89c4e7a";

const chart = (
  position: number,
  title: string,
  type: string,
  xAxis: string,
  seriesFields: string[]
): Chart =>
  ({
    id: `${INSIGHT_ID}-chart-${position}`,
    position,
    title,
    type,
    xAxis,
    yAxis: "",
    colorField: "",
    stackField: "",
    groupField: "",
    seriesFields,
    data: [],
  }) as Chart;

const LGMS_CHARTS: Chart[] = [
  chart(0, "Net GHG Flux — Full Detail", "stacked-bar-with-line", "year", [
    "tree_loss_emissions",
    "tree_gain_removals",
  ]),
  chart(1, "Net GHG Flux by Category", "stacked-bar-with-line", "year", [
    "vegetation_emissions",
    "soil_removals",
  ]),
  chart(2, "Net GHG Flux Summary", "stacked-bar-with-line", "year", [
    "land_use_emissions",
    "land_use_removals",
  ]),
  chart(3, "Net GHG Flux — Annual Average", "hierarchical-bar", "", []),
];

/**
 * What useAnalysis does to every widget: the design's per-chart-type title,
 * with the backend's own kept on `backendTitle` for the DETAIL pill.
 */
const DISPLAY_TITLES: Record<string, string> = {
  "stacked-bar-with-line": "Net flux over time",
  "hierarchical-bar": "Net GHG flux (annual average)",
};

function applyDisplayTitle(widgets: InsightWidget[]): InsightWidget[] {
  return widgets.map((w) => ({
    ...w,
    backendTitle: w.title,
    title: DISPLAY_TITLES[w.type] ?? w.title,
  }));
}

function pagerEntries() {
  const widgets = applyDisplayTitle(chartsToWidgets(LGMS_CHARTS));
  return {
    widgets,
    entries: orderInsightsForPager(collapseNetFluxSiblings(widgets, {})),
  };
}

describe("LGMS analysis → insight workspace pager", () => {
  it("gives every chart a real renderer, with no axis-guard fallback", () => {
    const { widgets } = pagerEntries();
    expect(widgets.map((w) => w.type)).toEqual([
      "stacked-bar-with-line",
      "stacked-bar-with-line",
      "stacked-bar-with-line",
      "hierarchical-bar",
    ]);
    // The hierarchy has no cartesian axes, so it must never reach ChartWidget.
    const hierarchy = widgets[3];
    expect(hierarchy.xAxis).toBe("");
    expect(isFluxTreeWidget(hierarchy)).toBe(true);
    expect(isNetFluxWidget(hierarchy)).toBe(false);
  });

  it("collapses the three roll-ups into a two-entry pager", () => {
    const { entries } = pagerEntries();
    expect(entries).toHaveLength(2);
  });

  it("leads with the time-series, not the last chart the generator emitted", () => {
    const { entries } = pagerEntries();
    expect(entries[0].backendTitle).toBe("Net GHG Flux — Full Detail");
    expect(entries[1].backendTitle).toBe("Net GHG Flux — Annual Average");
  });

  it("titles the two pager cards as the design names them", () => {
    const { entries } = pagerEntries();
    expect(entries.map((w) => w.title)).toEqual([
      "Net flux over time",
      "Net GHG flux (annual average)",
    ]);
  });

  it("keeps the DETAIL labels distinct under the shared display title", () => {
    const { widgets } = pagerEntries();
    const rollUps = widgets.filter(isNetFluxWidget);
    expect(rollUps.map(netFluxWidgetDetailLabel)).toEqual([
      "Full detail",
      "Category",
      "Summary",
    ]);
    // The display title alone would have made all three identical.
    expect(new Set(rollUps.map((w) => w.title)).size).toBe(1);
  });

  it("follows the DETAIL selection for the collapsed entry", () => {
    const { widgets } = pagerEntries();
    const entries = orderInsightsForPager(
      collapseNetFluxSiblings(widgets, {
        [INSIGHT_ID]: `${INSIGHT_ID}-chart-2`,
      })
    );
    expect(entries[0].backendTitle).toBe("Net GHG Flux Summary");
    expect(entries).toHaveLength(2);
  });
});
