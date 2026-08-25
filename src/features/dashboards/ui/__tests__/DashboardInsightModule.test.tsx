// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import DashboardInsightModule from "../DashboardInsightModule";
import type { DashboardWidget } from "../../api/schemas";
import {
  withChartHidden,
  withChartShown,
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
}: {
  widget?: DashboardWidget;
  isOwner?: boolean;
  onUpdateConfig?: (config: Record<string, unknown>) => void;
  onRemove?: () => void;
} = {}) {
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardInsightModule
        widget={w}
        isOwner={isOwner}
        onArmDrag={() => {}}
        onDisarmDrag={() => {}}
        onUpdateConfig={onUpdateConfig}
        onRemove={onRemove}
      />
    </ChakraProvider>
  );
  return { onUpdateConfig, onRemove };
}

describe("DashboardInsightModule", () => {
  it("renders the header title, summary with the AI caption, and one card per shown chart", () => {
    renderModule();
    expect(
      screen.getByText(/There were 1,055 disturbance alerts\./)
    ).toBeTruthy();
    // The shared InsightCaption badge, as on workspace insight cards.
    expect(screen.getByText(/AI-ASSISTED/)).toBeTruthy();
    const cards = screen.getAllByTestId("widget-message");
    expect(cards.map((c) => c.textContent)).toEqual([
      "Disturbance alerts trend",
      "Alerts by month",
    ]);
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
    expect(screen.queryByText(/AI-ASSISTED/)).toBe(null);
    expect(screen.getAllByTestId("widget-message")).toHaveLength(2);
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

  it("shows the not-available placeholder when the insight is missing", () => {
    renderModule({ widget: widget({ insight: null }) });
    expect(screen.getByText("This analysis is not available.")).toBeTruthy();
  });

  it("collapses to the header only", () => {
    renderModule();
    fireEvent.click(screen.getByLabelText("Collapse analysis"));
    expect(screen.queryByText(/There were 1,055 disturbance alerts\./)).toBe(
      null
    );
    expect(screen.queryAllByTestId("widget-message")).toHaveLength(0);
    // Header title survives the collapse.
    expect(screen.getByText("Disturbance alerts trend")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Expand analysis"));
    expect(screen.getAllByTestId("widget-message")).toHaveLength(2);
  });

  it("hides owner controls from non-owners but keeps collapse", () => {
    renderModule({ isOwner: false });
    expect(screen.queryByLabelText("Remove analysis from dashboard")).toBe(
      null
    );
    expect(screen.queryByLabelText("Drag to reposition analysis")).toBe(null);
    expect(screen.getByLabelText("Collapse analysis")).toBeTruthy();
  });

  it("removes the whole module through a confirm dialog", async () => {
    const { onRemove } = renderModule();
    fireEvent.click(screen.getByLabelText("Remove analysis from dashboard"));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
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

  it("hides the customize menu from non-owners", () => {
    renderModule({ isOwner: false });
    expect(screen.queryByRole("button", { name: "Customize" })).toBe(null);
  });

  it("hides a chart via its card's remove control by patching config", async () => {
    const { onUpdateConfig } = renderModule();
    // Each chart card keeps its own X; removing one hides just that chart.
    fireEvent.click(screen.getAllByLabelText("Remove from dashboard")[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      withChartHidden({}, "c-1", ["c-1", "c-2"])
    );
  });

  it("says a card's X removes a chart even when only one is left showing", async () => {
    // The card's X hides, never deletes the widget, so the dialog must not
    // promise a widget removal just because this is the last visible card.
    const { onUpdateConfig, onRemove } = renderModule({
      widget: widget({
        config: { chartIds: ["c-1"] },
        insight: {
          id: "ins-1",
          insight_text: "There were 1,055 disturbance alerts.",
          codeact_parts: null,
          charts: [
            chart(),
            chart({ id: "c-2", position: 1, title: "Alerts by month" }),
            chart({ id: "c-3", position: 2, title: "Alerts by driver" }),
          ],
        },
      }),
    });
    expect(screen.getAllByTestId("widget-message")).toHaveLength(1);

    fireEvent.click(screen.getByLabelText("Remove from dashboard"));
    expect(await screen.findByText("Remove chart?")).toBeTruthy();
    expect(screen.queryByText("Remove widget?")).toBe(null);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      withChartHidden({ chartIds: ["c-1"] }, "c-1", ["c-1", "c-2", "c-3"])
    );
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("names the lost arrangement when removing a customised module", async () => {
    renderModule({
      widget: widget({ config: { sizes: { "c-1": "double" } } }),
    });
    fireEvent.click(screen.getByLabelText("Remove analysis from dashboard"));
    expect(
      await screen.findByText(/layout and visibility changes are lost/i)
    ).toBeTruthy();
  });

  it("omits the lost-arrangement line for an untouched module", async () => {
    renderModule();
    fireEvent.click(screen.getByLabelText("Remove analysis from dashboard"));
    expect(await screen.findByText("Remove analysis?")).toBeTruthy();
    expect(screen.queryByText(/layout and visibility changes are lost/i)).toBe(
      null
    );
  });
});
