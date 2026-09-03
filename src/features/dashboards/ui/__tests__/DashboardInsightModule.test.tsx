// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

/** The chart body the stubbed WidgetMessage rendered, or null. */
const shownChart = () =>
  screen.queryByTestId("widget-message")?.textContent ?? null;

describe("DashboardInsightModule", () => {
  // Chakra's confirm dialog restores focus a tick after it unmounts. Left
  // pending, that restore lands inside the next test and blurs whatever it
  // just focused — which silently cancels an in-progress rename.
  afterEach(() => new Promise((resolve) => setTimeout(resolve, 0)));

  it("renders one card: the first chart, the summary and the AI caption", () => {
    renderModule();
    expect(
      screen.getByText(/There were 1,055 disturbance alerts\./)
    ).toBeTruthy();
    // The shared InsightCaption badge, as on workspace insight cards.
    expect(screen.getByText(/AI-ASSISTED/)).toBeTruthy();
    // One chart on show — not one card per chart.
    expect(screen.getAllByTestId("widget-message")).toHaveLength(1);
    // The header names the chart on show, beside the body's own title.
    expect(shownChart()).toBe("Disturbance alerts trend");
    expect(screen.getAllByText("Disturbance alerts trend")).toHaveLength(2);
  });

  it("pages through the insight's charts", () => {
    renderModule();
    expect(screen.getByText("1 of 2 charts")).toBeTruthy();
    expect(screen.getByLabelText("Previous chart")).toHaveProperty(
      "disabled",
      true
    );

    fireEvent.click(screen.getByLabelText("Next chart"));
    expect(shownChart()).toBe("Alerts by month");
    expect(screen.getByText("2 of 2 charts")).toBeTruthy();
    expect(screen.getByLabelText("Next chart")).toHaveProperty(
      "disabled",
      true
    );

    fireEvent.click(screen.getByLabelText("Previous chart"));
    expect(shownChart()).toBe("Disturbance alerts trend");
  });

  it("omits the pager for a single-chart insight", () => {
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
    expect(screen.queryByLabelText("Next chart")).toBe(null);
  });

  it("keeps a chart on show when the page it was on is hidden", () => {
    // Hiding the last chart while it is the one on show must not leave the
    // card blank — the pager clamps back into the shown set.
    const { rerender } = renderModule();
    fireEvent.click(screen.getByLabelText("Next chart"));
    expect(shownChart()).toBe("Alerts by month");

    rerender(
      <ChakraProvider value={defaultSystem}>
        <DashboardInsightModule
          widget={widget({ config: { chartIds: ["c-1"] } })}
          isOwner
          isDouble
          onArmDrag={() => {}}
          onToggleSize={() => {}}
          onUpdateConfig={() => {}}
          onRemove={() => {}}
        />
      </ChakraProvider>
    );
    expect(shownChart()).toBe("Disturbance alerts trend");
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
    expect(shownChart()).toBe("Disturbance alerts trend");
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

  it("hides owner controls from non-owners", () => {
    renderModule({ isOwner: false });
    expect(screen.queryByLabelText("Remove from dashboard")).toBe(null);
    expect(screen.queryByLabelText("Drag to reposition")).toBe(null);
    expect(screen.queryByRole("button", { name: "Customize" })).toBe(null);
    // The chart body and its pager stay: paging is reading, not editing.
    expect(shownChart()).toBe("Disturbance alerts trend");
    expect(screen.getByLabelText("Next chart")).toBeTruthy();
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

  it("renames the chart on show", async () => {
    const { onUpdateConfig } = renderModule();
    fireEvent.click(screen.getByLabelText("Next chart"));
    fireEvent.click(screen.getByLabelText("Rename widget"));
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
