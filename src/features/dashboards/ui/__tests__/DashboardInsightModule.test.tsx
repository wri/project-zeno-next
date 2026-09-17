// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The card's toaster import reaches a .tsx module boundary — stub it.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// The chart body is WidgetMessage's contract, not the module's — stub it to a
// marker so these tests assert structure without mounting echarts.
vi.mock("@/app/components/WidgetMessage", () => ({
  default: ({ widget }: { widget: { title: string } }) => (
    <div data-testid="widget-message">{widget.title}</div>
  ),
}));

// Map bodies need WebGL — never rendered here, but keep the import inert.
vi.mock("../DashboardMapWidget", () => ({ default: () => null }));

import useNetFluxViewStore from "@/src/features/net-flux/model/net-flux-view-store";
import DashboardInsightModule from "../DashboardInsightModule";
import type { DashboardWidget } from "../../api/schemas";
import {
  withChartHidden,
  withChartShown,
  withChartTitle,
  withSummaryShown,
} from "../../lib/widgets";

function chart(overrides: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    position: 0,
    title: "Disturbance alerts trend",
    chart_type: "line",
    x_axis: "year",
    y_axis: "area_ha",
    series_fields: null,
    chart_data: [{ year: 2020, area_ha: 5 }],
    ...overrides,
  };
}

function widget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    id: "w-1",
    position: 0,
    widget_type: "insight",
    insight_id: "ins-1",
    config: {},
    created_at: "2026-07-03T14:10:00",
    insight: {
      id: "ins-1",
      insight_text: "There were 1,055 disturbance alerts.",
      // Provenance present ⇒ the AI-assisted caption (mirrors WidgetMessage).
      codeact_parts: [{ type: "code", content: "df.plot()" }],
      charts: [
        chart(),
        chart({ id: "c-2", position: 1, title: "Alerts by month" }),
      ],
    },
    ...overrides,
  };
}

function renderModule({
  widget: w = widget(),
  isOwner = true,
  onUpdateConfig = vi.fn(),
  onRemove = vi.fn(),
  onToggleSize = vi.fn(),
}: {
  widget?: DashboardWidget;
  isOwner?: boolean;
  onUpdateConfig?: (config: Record<string, unknown>) => void;
  onRemove?: () => void;
  onToggleSize?: () => void;
} = {}) {
  const view = render(
    <ChakraProvider value={defaultSystem}>
      <DashboardInsightModule
        widget={w}
        isOwner={isOwner}
        isDouble
        onArmDrag={() => {}}
        onToggleSize={onToggleSize}
        onUpdateConfig={onUpdateConfig}
        onRemove={onRemove}
      />
    </ChakraProvider>
  );
  return { ...view, onUpdateConfig, onRemove, onToggleSize };
}

/** Every chart body the stubbed WidgetMessage rendered, in render order. */
const shownCharts = () =>
  screen.queryAllByTestId("widget-message").map((el) => el.textContent);

/** The first chart body, for the single-card cases. */
const shownChart = () => shownCharts()[0] ?? null;

describe("DashboardInsightModule", () => {
  // Chakra's confirm dialog restores focus a tick after it unmounts. Left
  // pending, that restore lands inside the next test and blurs whatever it
  // just focused — which silently cancels an in-progress rename.
  afterEach(() => new Promise((resolve) => setTimeout(resolve, 0)));

  // Module-level singleton: a DETAIL choice would otherwise leak between tests.
  beforeEach(() => useNetFluxViewStore.setState({ detailByGroup: {} }));

  it("deals one card per chart as a set, with the summary and AI caption", () => {
    renderModule();
    expect(
      screen.getByText(/There were 1,055 disturbance alerts\./)
    ).toBeTruthy();
    // The shared InsightCaption badge, as on workspace insight cards.
    expect(screen.getByText(/AI-ASSISTED/)).toBeTruthy();
    // Both charts on screen at once — the pair reads as one finding.
    expect(shownCharts()).toEqual([
      "Disturbance alerts trend",
      "Alerts by month",
    ]);
    // Each card's header names its own chart, beside the body's own title.
    expect(screen.getAllByText("Disturbance alerts trend")).toHaveLength(2);
    expect(screen.getAllByText("Alerts by month")).toHaveLength(2);
  });

  it("has no chart pager at all", () => {
    renderModule();
    expect(screen.queryByLabelText("Next chart")).toBe(null);
    expect(screen.queryByLabelText("Previous chart")).toBe(null);
    expect(screen.queryByText(/of \d+ charts/)).toBe(null);
  });

  it("renders a single-chart insight as one card", () => {
    renderModule({
      widget: widget({
        insight: {
          id: "ins-1",
          insight_text: "There were 1,055 disturbance alerts.",
          codeact_parts: null,
          charts: [chart()],
        },
      }),
    });
    expect(shownCharts()).toEqual(["Disturbance alerts trend"]);
  });

  it("drops a hidden chart's card and keeps the rest", () => {
    renderModule({ widget: widget({ config: { chartIds: ["c-1"] } }) });
    expect(shownCharts()).toEqual(["Disturbance alerts trend"]);
  });

  it("shows the widget-level controls on the lead card only", () => {
    renderModule();
    // Drag, span and whole-widget removal act on the widget, so one copy each.
    expect(screen.getAllByLabelText("Drag to reposition")).toHaveLength(1);
    expect(screen.getAllByLabelText("Shrink to one column")).toHaveLength(1);
    expect(screen.getAllByLabelText("Remove from dashboard")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Customize" })).toHaveLength(
      1
    );
    // The later card's X hides its own chart instead.
    expect(screen.getAllByLabelText("Hide chart")).toHaveLength(1);
  });

  it("hides just that chart when a later card's X is confirmed", async () => {
    const { onUpdateConfig, onRemove } = renderModule();
    fireEvent.click(screen.getByLabelText("Hide chart"));
    expect(await screen.findByText("Remove chart?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(onUpdateConfig).toHaveBeenCalledWith(
        withChartHidden({}, "c-2", ["c-1", "c-2"])
      )
    );
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("shows the curated caption when the insight has no generation provenance", () => {
    renderModule({
      widget: widget({
        insight: {
          id: "ins-1",
          insight_text: "There were 1,055 disturbance alerts.",
          codeact_parts: null,
          charts: [chart()],
        },
      }),
    });
    expect(screen.getByText(/CURATED/)).toBeTruthy();
    expect(screen.queryByText(/AI-ASSISTED/)).toBe(null);
  });

  it("hides the summary when config says so", () => {
    renderModule({ widget: widget({ config: { summaryHidden: true } }) });
    expect(screen.queryByText(/There were 1,055 disturbance alerts\./)).toBe(
      null
    );
    expect(shownCharts()).toEqual([
      "Disturbance alerts trend",
      "Alerts by month",
    ]);
  });

  it("renders the summary alone when every chart is hidden", () => {
    renderModule({ widget: widget({ config: { chartIds: [] } }) });
    expect(
      screen.getByText(/There were 1,055 disturbance alerts\./)
    ).toBeTruthy();
    expect(screen.queryAllByTestId("widget-message")).toHaveLength(0);
    expect(screen.queryByText(/use Customize/i)).toBe(null);
  });

  it("shows the all-hidden placeholder for owners when summary and charts are hidden", () => {
    renderModule({
      widget: widget({ config: { chartIds: [], summaryHidden: true } }),
    });
    expect(screen.getByText(/hidden/i)).toBeTruthy();
  });

  describe("an LGMS analysis", () => {
    // The four charts `charts/lgms.py` returns, with the backend chart UUIDs
    // a dashboard widget carries (not the `{insightId}-chart-{n}` ids the map
    // workspace groups by).
    const lgmsWidget = () =>
      widget({
        insight: {
          id: "ins-lgms",
          insight_text: "",
          codeact_parts: [],
          charts: [
            chart({
              id: "c-tree",
              position: 0,
              title: "Net GHG Flux — Annual Average",
              chart_type: "hierarchical-bar",
              x_axis: "",
              y_axis: "",
              chart_data: [
                { id: "total", parent_id: null, avg_emissions: 4_000_000 },
              ],
            }),
            chart({
              id: "c-full",
              position: 1,
              title: "Net GHG Flux — Full Detail",
              chart_type: "stacked-bar-with-line",
              chart_data: [{ year: 2020, tree_loss_emissions: 1 }],
            }),
            chart({
              id: "c-category",
              position: 2,
              title: "Net GHG Flux by Category",
              chart_type: "stacked-bar-with-line",
              chart_data: [{ year: 2020, vegetation_emissions: 1 }],
            }),
            chart({
              id: "c-summary",
              position: 3,
              title: "Net GHG Flux Summary",
              chart_type: "stacked-bar-with-line",
              chart_data: [{ year: 2020, land_use_emissions: 1 }],
            }),
          ],
        },
      });

    it("deals two cards from its four charts, the roll-ups folded into one", () => {
      renderModule({ widget: lgmsWidget() });
      // Category leads the roll-ups: it is what the fold shows by default.
      expect(shownCharts()).toEqual([
        "Net GHG Flux — Annual Average",
        "Net GHG Flux by Category",
      ]);
    });

    it("gives each card its own pills, DETAIL only on the roll-up", () => {
      renderModule({ widget: lgmsWidget() });
      // The pill's accessible name carries the selection; the menu itself is
      // Ark's and is exercised by the shared Pill, not here.
      expect(
        screen.getByRole("button", { name: "DETAIL: Category" })
      ).toBeTruthy();
      // The tree card has a MEASURE pill but no DETAIL of its own — its detail
      // is the tree's disclosure carets. Both cards carry a MEASURE.
      expect(screen.getAllByRole("button", { name: /^MEASURE/ })).toHaveLength(
        2
      );
      expect(screen.getAllByRole("button", { name: /^DETAIL/ })).toHaveLength(
        1
      );
    });

    it("swaps the folded card when another roll-up is selected", async () => {
      renderModule({ widget: lgmsWidget() });

      // What the DETAIL pill does on select. The store is the contract between
      // the pill (inside the card) and this shell, which is why it exists.
      useNetFluxViewStore.getState().selectDetail("w-1", "c-full");

      await waitFor(() =>
        expect(shownCharts()).toEqual([
          "Net GHG Flux — Annual Average",
          "Net GHG Flux — Full Detail",
        ])
      );
      expect(screen.getByRole("button", { name: "DETAIL: Full" })).toBeTruthy();
    });

    it("keeps all four charts in the Customize menu", async () => {
      renderModule({ widget: lgmsWidget() });
      fireEvent.click(screen.getByRole("button", { name: "Customize" }));

      for (const title of [
        "Net GHG Flux — Annual Average",
        "Net GHG Flux — Full Detail",
        "Net GHG Flux by Category",
        "Net GHG Flux Summary",
      ]) {
        expect(
          await screen.findByRole("checkbox", { name: `Chart · ${title}` })
        ).toBeTruthy();
      }
    });
  });

  it("shows the not-available placeholder when the insight is missing", () => {
    renderModule({ widget: widget({ insight: null }) });
    expect(screen.getByText("This analysis is not available.")).toBeTruthy();
  });

  it("hides owner controls from non-owners", () => {
    renderModule({ isOwner: false });
    expect(screen.queryByLabelText("Remove from dashboard")).toBe(null);
    expect(screen.queryByLabelText("Drag to reposition")).toBe(null);
    expect(screen.queryByRole("button", { name: "Customize" })).toBe(null);
    expect(screen.queryByLabelText("Hide chart")).toBe(null);
    // The chart bodies stay: reading the set is not editing it.
    expect(shownCharts()).toEqual([
      "Disturbance alerts trend",
      "Alerts by month",
    ]);
  });

  it("removes the whole widget through the analysis confirm dialog", async () => {
    const { onRemove } = renderModule();
    fireEvent.click(screen.getByLabelText("Remove from dashboard"));
    // The analysis copy, not the card's generic "Remove widget?".
    expect(await screen.findByText("Remove analysis?")).toBeTruthy();
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renames a chart through its own card's header", async () => {
    const { onUpdateConfig } = renderModule();
    // Each card renames its own chart: the second card's header edits c-2.
    fireEvent.click(screen.getAllByLabelText("Rename widget")[1]);
    const input = (await screen.findByLabelText(
      "Widget title"
    )) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Monthly alerts" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onUpdateConfig).toHaveBeenCalledWith(
      withChartTitle({}, "c-2", "Monthly alerts")
    );
  });

  it("customize menu toggles summary and charts via config patches", async () => {
    const config = { chartIds: ["c-1"] };
    const { onUpdateConfig } = renderModule({ widget: widget({ config }) });
    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    // All charts are listed, hidden ones included.
    const hiddenRow = await screen.findByRole("checkbox", {
      name: "Chart · Alerts by month",
    });
    fireEvent.click(hiddenRow);
    await waitFor(() =>
      expect(onUpdateConfig).toHaveBeenCalledWith(
        withChartShown(config, "c-2", ["c-1", "c-2"])
      )
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "AI generated summary" })
    );
    await waitFor(() =>
      expect(onUpdateConfig).toHaveBeenCalledWith(
        withSummaryShown(config, false)
      )
    );
  });

  it("names the lost arrangement when removing a customised module", async () => {
    renderModule({
      widget: widget({ config: { titles: { "c-1": "Renamed" } } }),
    });
    fireEvent.click(screen.getByLabelText("Remove from dashboard"));
    expect(
      await screen.findByText(/layout and visibility changes are lost/i)
    ).toBeTruthy();
  });

  it("omits the lost-arrangement line for an untouched module", async () => {
    renderModule();
    fireEvent.click(screen.getByLabelText("Remove from dashboard"));
    expect(await screen.findByText("Remove analysis?")).toBeTruthy();
    expect(screen.queryByText(/layout and visibility changes are lost/i)).toBe(
      null
    );
  });
});
