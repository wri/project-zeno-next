// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/alerts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/alerts")>()),
  fetchAlertsList: vi.fn(),
}));

// The map pane's body is MapLibre's; a stub that exposes the period it was
// given is what this test needs.
vi.mock("../DashboardMapWidget", () => ({
  default: ({
    dateRange,
    layer,
  }: {
    dateRange?: { start: string; end: string };
    layer: { tileUrl: string };
  }) => (
    <div
      data-testid="map-widget"
      data-start={dateRange?.start ?? ""}
      data-end={dateRange?.end ?? ""}
      data-tiles={layer.tileUrl}
    />
  ),
}));

import {
  AlertsListError,
  fetchAlertsList,
  toAlertsList,
} from "../../api/alerts";
import {
  ALERTS_LIST_WIRE,
  ALERTS_WIDGET_CONFIG,
} from "../../api/__tests__/fixtures";
import type { DashboardWidget } from "../../api/schemas";
import { initialWindow, todayIso } from "../../lib/alertsWidgets";
import DashboardAlertsWidget from "../DashboardAlertsWidget";

const mockedFetch = vi.mocked(fetchAlertsList);

const widget: DashboardWidget = {
  id: "w-alerts",
  position: 0,
  widget_type: "alerts",
  config: ALERTS_WIDGET_CONFIG,
  created_at: "2026-10-16T00:00:00Z",
  insight: null,
};

const areaAoi = {
  id: "a1",
  position: 0,
  source: "gadm",
  src_id: "BRA.16.137_2",
  subtype: "district",
  name: "Guarapuava",
};

const aoi = {
  source: "gadm",
  srcId: "BRA.16.137_2",
  subtype: "district",
  name: "Guarapuava",
};

function renderWidget(
  overrides: Partial<React.ComponentProps<typeof DashboardAlertsWidget>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardAlertsWidget
          widget={widget}
          areaAoi={areaAoi}
          isOwner
          isDouble
          onArmDrag={() => {}}
          onToggleSize={() => {}}
          onRename={() => {}}
          onRemove={() => {}}
          {...overrides}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

const mapPane = () => screen.getByTestId("map-widget");

describe("DashboardAlertsWidget", () => {
  // Block body on purpose: a function returned from `beforeEach` runs as the
  // teardown, and `mockReset()` returns the mock.
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("fetches the widget's window once and shows the new week in both panes", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();

    expect(screen.getByText("Integrated alerts in Guarapuava")).toBeTruthy();
    await screen.findByText("5 alert days · 50.8 ha in this period");

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      aoi,
      initialWindow(30, todayIso())
    );
    expect(screen.getByText("DATA TO OCT 16, 2026")).toBeTruthy();
    expect(
      screen.getByText("Integrated alerts in Guarapuava · map")
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-04");
    expect(mapPane().dataset.end).toBe("2026-10-10");
  });

  it("filters the cached rows per chip and re-dates the map without fetching again", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();
    await screen.findByText("5 alert days · 50.8 ha in this period");

    fireEvent.click(screen.getByRole("button", { name: "Last day" }));
    expect(screen.getByText("1 alert day · 5 ha in this period")).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-16");
    expect(mapPane().dataset.end).toBe("2026-10-16");

    fireEvent.click(screen.getByRole("button", { name: "Last week" }));
    expect(
      screen.getByText("5 alert days · 35.7 ha in this period")
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-10");

    // The tier changes the chip's hectares and the badge row's label.
    fireEvent.click(screen.getByRole("button", { name: "High" }));
    expect(
      screen.getByText("4 alert days · 28.1 ha in this period")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /New this week/ }).textContent
    ).toContain("41.4 ha");
    const confidenceChip = screen.getByText("CONFIDENCE").parentElement;
    expect(confidenceChip?.textContent).toBe("CONFIDENCEHigh");

    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches a wider window only when a custom range reaches outside, keeping the rows on show", async () => {
    const first = toAlertsList(ALERTS_LIST_WIRE);
    const wider = toAlertsList({
      ...ALERTS_LIST_WIRE,
      start_date: "2026-08-01",
      rows: [
        ...ALERTS_LIST_WIRE.rows,
        {
          alert_date: "2026-08-20",
          high_ha: 2,
          highest_ha: 1,
          total_ha: 3,
          new: false,
        },
      ],
    });
    let resolveWider: (list: typeof wider) => void = () => {};
    mockedFetch
      .mockResolvedValueOnce(first)
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveWider = resolve))
      );
    renderWidget();
    await screen.findByText("5 alert days · 50.8 ha in this period");

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    // Opens on the last week, inside the window: no fetch.
    expect(
      screen.getByLabelText("Custom period start").getAttribute("value")
    ).toBe("2026-10-10");
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Custom period start"), {
      target: { value: "2026-10-01" },
    });
    expect(
      screen.getByText("10 alert days · 80.7 ha in this period")
    ).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Custom period start"), {
      target: { value: "2026-08-01" },
    });
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch.mock.calls[1][1]).toEqual({
      start: "2026-08-01",
      end: initialWindow(30, todayIso()).end,
    });
    // The rows already held stay on show, dimmed, while the wider window loads.
    const table = screen.getByRole("table", { name: "Alert days" });
    expect(table.closest("[aria-busy='true']")).toBeTruthy();
    expect(
      screen.getByText("14 alert days · 105.7 ha in this period")
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-08-01");

    resolveWider(wider);
    await screen.findByText("15 alert days · 108.7 ha in this period");
    expect(
      within(screen.getByRole("table", { name: "Alert days" })).getAllByRole(
        "row"
      )
    ).toHaveLength(1 + 10);
  });

  it("shows the backend's 502 sentence with a Retry that fetches again", async () => {
    const sentence =
      "Integrated alerts data is unavailable right now. Please try again in a moment.";
    mockedFetch
      .mockRejectedValueOnce(new AlertsListError(sentence, true, 502))
      .mockResolvedValueOnce(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();

    await screen.findByText(sentence);
    expect(screen.queryByText("DATA TO OCT 16, 2026")).toBeNull();
    // The map still draws the snapshot's own period.
    expect(mapPane().dataset.start).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("5 alert days · 50.8 ha in this period");
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("ignores a bound outside the data, as a date input reports mid-typing", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();
    await screen.findByText("5 alert days · 50.8 ha in this period");
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    const start = screen.getByLabelText("Custom period start");
    // "2026" being typed into the year passes through "0002".
    fireEvent.change(start, { target: { value: "0002-08-01" } });
    expect(start.getAttribute("value")).toBe("2026-10-10");
    fireEvent.change(screen.getByLabelText("Custom period end"), {
      target: { value: "2027-01-01" },
    });
    expect(
      screen.getByLabelText("Custom period end").getAttribute("value")
    ).toBe("2026-10-16");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the rows on show when a wider window fails, with the failure above them", async () => {
    mockedFetch
      .mockResolvedValueOnce(toAlertsList(ALERTS_LIST_WIRE))
      .mockRejectedValueOnce(
        new AlertsListError("Couldn't load the alerts.", true)
      );
    renderWidget();
    await screen.findByText("5 alert days · 50.8 ha in this period");

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Custom period start"), {
      target: { value: "2026-08-01" },
    });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the alerts.");
    expect(
      screen.getByText("14 alert days · 105.7 ha in this period")
    ).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("offers no Retry for an area the backend does not cover", async () => {
    mockedFetch.mockRejectedValue(
      new AlertsListError("Alerts aren't available for this area.", false, 422)
    );
    renderWidget();
    await screen.findByText("Alerts aren't available for this area.");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches for a viewer too", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget({ isOwner: false });
    await screen.findByText("5 alert days · 50.8 ha in this period");
    expect(screen.queryByLabelText("Remove from dashboard")).toBeNull();
  });

  it("shows a placeholder, and fetches nothing, for a config it cannot render", () => {
    renderWidget({
      widget: { ...widget, config: { alerts: { aoi: { source: "gadm" } } } },
    });
    expect(
      screen.getByText("This alerts widget can't be displayed.")
    ).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId("map-widget")).toBeNull();
  });
});
