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

// The browser save is DOM glue; the test reads what would be saved.
vi.mock("@/src/shared/lib/csv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/shared/lib/csv")>()),
  downloadCsv: vi.fn(),
}));

// The map pane's body is MapLibre's; a stub that exposes the layer it was
// given (its period and context) is what this test needs.
vi.mock("../DashboardMapWidget", () => ({
  default: ({
    layer,
  }: {
    layer: {
      tileUrl: string;
      contextLayerName?: string;
      startDate?: string;
      endDate?: string;
    };
  }) => (
    <div
      data-testid="map-widget"
      data-start={layer.startDate ?? ""}
      data-end={layer.endDate ?? ""}
      data-tiles={layer.tileUrl}
      data-context={layer.contextLayerName ?? ""}
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
import { downloadCsv } from "@/src/shared/lib/csv";
import { todayIso } from "@/src/shared/lib/iso-date";
import { initialWindow } from "../../lib/alertsWidgets";
import DashboardAlertsWidget from "../DashboardAlertsWidget";
import { chooseFromMenu } from "./chakraMenu";

const mockedFetch = vi.mocked(fetchAlertsList);
const mockedDownload = vi.mocked(downloadCsv);

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
  subtype: "district-county",
  name: "Guarapuava",
};

const aoi = {
  source: "gadm",
  srcId: "BRA.16.137_2",
  subtype: "district-county",
  name: "Guarapuava",
};

/**
 * A list whose data lags: its latest alert day (20 Sep) is four days into a
 * window starting 16 Sep, so two weeks before it (7 Sep) lies outside the
 * window — the one case the widget asks for a wider one.
 */
const LAGGING_WIRE = {
  data_to: "2026-09-20",
  start_date: "2026-09-16",
  end_date: "2026-10-19",
  new_week: { start_date: "2026-09-13", end_date: "2026-09-19" },
  total_area_ha: 3,
  rows: [
    {
      alert_date: "2026-09-18",
      high_ha: 2,
      highest_ha: 1,
      total_ha: 3,
      new: true,
    },
  ],
};
const LAGGING = toAlertsList(LAGGING_WIRE);

/** The lagging list fetched again from 7 Sep: one more day in the extra week. */
const LAGGING_WIDER = toAlertsList({
  ...LAGGING_WIRE,
  start_date: "2026-09-07",
  total_area_ha: 7,
  rows: [
    ...LAGGING_WIRE.rows,
    {
      alert_date: "2026-09-10",
      high_ha: 3,
      highest_ha: 1,
      total_ha: 4,
      new: false,
    },
  ],
});

const NEW_WEEK_FOOTER = "5 alert days · 50.8 ha in this period";
const LAGGING_FOOTER = "1 alert day · 3 ha in this period";

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

const kpi = (name: string) => screen.getByRole("group", { name }).textContent;

const chip = (label: string) =>
  screen.getByText(label).parentElement?.textContent;

/** Opens the Custom dates and returns the start input. */
async function openCustomStart() {
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  return screen.findByLabelText("Custom period start");
}

const chooseFromDropdown = (trigger: string, option: string) =>
  chooseFromMenu(screen.getByRole("button", { name: trigger }), option);

describe("DashboardAlertsWidget", () => {
  // Block body on purpose: a function returned from `beforeEach` runs as the
  // teardown, and `mockReset()` returns the mock.
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("fetches the widget's window once and shows the new week in the headline and both panes", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();

    expect(screen.getByText("Integrated alerts in Guarapuava")).toBeTruthy();
    await screen.findByText(NEW_WEEK_FOOTER);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      aoi,
      initialWindow(30, todayIso()),
      "any"
    );
    expect(kpi("New this week")).toBe(
      "50.8ha new this weekDATED 4 – 10 OCT 2026"
    );
    expect(kpi("Alerts since")).toBe(
      "71ha of alerts since 3 Oct3 – 16 OCT 2026 · COUNTED TO LATEST UPDATE"
    );
    // No pane header: the map lines up with the list; its full-screen
    // control is inside the map.
    expect(screen.queryByText(/· map/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "View map full screen" })
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-04");
    expect(mapPane().dataset.end).toBe("2026-10-10");
    expect(mapPane().dataset.context).toBe("");
  });

  it("keeps the params chips behind the card's Show params toggle, as an analysis card's", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();
    await screen.findByText(NEW_WEEK_FOOTER);

    expect(screen.queryByText("AREA")).toBeNull();
    expect(screen.queryByText("CONFIDENCE")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show params" }));
    expect(chip("AREA")).toBe("AREAGuarapuava");
    expect(chip("DATA")).toBe("DATAIntegrated alerts");
    expect(chip("CONFIDENCE")).toBe("CONFIDENCEHigh · Highest");
    fireEvent.click(screen.getByRole("button", { name: "Hide params" }));
    expect(screen.queryByText("AREA")).toBeNull();
  });

  it("filters the cached rows per chip and re-dates the map without fetching again", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();
    await screen.findByText(NEW_WEEK_FOOTER);

    // "Last week" ends on the latest alert day (16 Oct), not the window's
    // end (19 Oct) and not today.
    fireEvent.click(screen.getByRole("button", { name: "Last week" }));
    expect(
      screen.getByText("5 alert days · 35.7 ha in this period")
    ).toBeTruthy();
    expect(
      screen.getByText(/Alert days from 10 Oct 2026 to 16 Oct 2026/)
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-10");
    expect(mapPane().dataset.end).toBe("2026-10-16");

    // The tier changes the cells, the headline and the chip.
    await chooseFromDropdown("Confidence: All", "High");
    expect(
      screen.getByText("4 alert days · 28.1 ha in this period")
    ).toBeTruthy();
    expect(kpi("New this week")).toContain("41.4ha new this week");
    expect(kpi("Alerts since")).toContain("57ha of alerts since 3 Oct");
    expect(
      screen.getByRole("button", { name: "Confidence: High" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show params" }));
    expect(chip("CONFIDENCE")).toBe("CONFIDENCEHigh");

    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("asks again with the land filter, holding the rows meanwhile, and overlays natural lands", async () => {
    const narrowed = toAlertsList({
      ...ALERTS_LIST_WIRE,
      rows: ALERTS_LIST_WIRE.rows.slice(4, 6),
    });
    let resolveNarrowed: (list: typeof narrowed) => void = () => {};
    mockedFetch
      .mockResolvedValueOnce(toAlertsList(ALERTS_LIST_WIRE))
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveNarrowed = resolve))
      );
    renderWidget();
    await screen.findByText(NEW_WEEK_FOOTER);

    await chooseFromDropdown("Intersects: Any", "Natural lands");
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch.mock.calls[1][2]).toBe("natural_lands");
    // Held rows, dimmed, until the narrowed list lands; the map already
    // draws natural lands beneath the alerts.
    expect(screen.getByText(NEW_WEEK_FOOTER)).toBeTruthy();
    expect(
      screen
        .getByRole("table", { name: "Alert days" })
        .closest("[aria-busy='true']")
    ).toBeTruthy();
    expect(mapPane().dataset.context).toBe("natural_lands");
    expect(
      screen.getByText(/to 10 Oct 2026, on natural lands, newest first/)
    ).toBeTruthy();

    resolveNarrowed(narrowed);
    await screen.findByText("2 alert days · 23 ha in this period");

    // Natural forests: its own overlay, from the snapshot's entry.
    mockedFetch.mockResolvedValueOnce(narrowed);
    await chooseFromDropdown("Intersects: Natural lands", "Natural forests");
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(3));
    expect(mockedFetch.mock.calls[2][2]).toBe("natural_forests");
    expect(mapPane().dataset.context).toBe("natural_forests");
    expect(screen.getByText(/on natural forests, newest first/)).toBeTruthy();

    // Any clears the overlay and asks for the unfiltered list (cached).
    await chooseFromDropdown("Intersects: Natural forests", "Any");
    expect(mapPane().dataset.context).toBe("");
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it("downloads the rows on show, with the period, tier and area in the file", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    mockedDownload.mockReset();
    renderWidget();
    await screen.findByText(NEW_WEEK_FOOTER);

    fireEvent.click(screen.getByRole("button", { name: "Last week" }));
    await chooseFromDropdown("Confidence: All", "Highest");
    await chooseFromDropdown("Download", "Data (CSV)");

    expect(mockedDownload).toHaveBeenCalledTimes(1);
    const [csv, filename] = mockedDownload.mock.calls[0];
    expect(filename).toBe(
      "integrated-alerts-guarapuava-2026-10-10-2026-10-16.csv"
    );
    expect(csv.split("\n")).toEqual([
      "alert_date,confidence,high_ha,highest_ha,total_ha,new",
      "2026-10-16,Highest,4.2,0.8,5,false",
      "2026-10-14,Highest,0,1.6,1.6,false",
      "2026-10-12,Highest,9.3,2.2,11.5,false",
      "2026-10-10,Highest,12.5,3,15.5,true",
    ]);
  });

  it("counts back from the window's end, without claiming a latest update, when the window has no alerts", async () => {
    mockedFetch.mockResolvedValue(
      toAlertsList({ ...ALERTS_LIST_WIRE, data_to: null, rows: [] })
    );
    renderWidget();
    await screen.findByText("No alerts in this period.");

    expect(kpi("Alerts since")).toBe(
      "0ha of alerts since 6 Oct6 – 19 OCT 2026"
    );
    fireEvent.click(screen.getByRole("button", { name: "Last week" }));
    expect(
      screen.getByText(/Alert days from 13 Oct 2026 to 19 Oct 2026/)
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-13");
    expect(mapPane().dataset.end).toBe("2026-10-19");
    const start = await openCustomStart();
    expect(start.getAttribute("min")).toBe("2026-10-06");
    expect(start.getAttribute("max")).toBe("2026-10-19");
  });

  it("asks once more for a window reaching two weeks before the latest alert day when the data lags, keeping the rows on show", async () => {
    let resolveWider: (list: typeof LAGGING_WIDER) => void = () => {};
    mockedFetch
      .mockResolvedValueOnce(LAGGING)
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveWider = resolve))
      );
    renderWidget();
    await screen.findByText(LAGGING_FOOTER);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch.mock.calls[1][1]).toEqual({
      start: "2026-09-07",
      end: initialWindow(30, todayIso()).end,
    });
    // The rows already held stay on show, dimmed, while the wider window loads.
    const table = screen.getByRole("table", { name: "Alert days" });
    expect(table.closest("[aria-busy='true']")).toBeTruthy();
    expect(kpi("Alerts since")).toBe(
      "3ha of alerts since 7 Sep7 – 20 SEP 2026 · COUNTED TO LATEST UPDATE"
    );

    resolveWider(LAGGING_WIDER);
    await waitFor(() =>
      expect(kpi("Alerts since")).toContain("7ha of alerts since 7 Sep")
    );
    expect(screen.getByText(LAGGING_FOOTER)).toBeTruthy();
    expect(table.closest("[aria-busy='true']")).toBeNull();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("shows the backend's 502 sentence with a Retry that fetches again", async () => {
    const sentence =
      "Integrated alerts data is unavailable right now. Please try again in a moment.";
    mockedFetch
      .mockRejectedValueOnce(new AlertsListError("unavailable", sentence))
      .mockResolvedValueOnce(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();

    await screen.findByText(sentence);
    expect(screen.queryByRole("group", { name: "Alerts since" })).toBeNull();
    // The map still draws the snapshot's own period.
    expect(mapPane().dataset.start).toBe("2026-09-16");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText(NEW_WEEK_FOOTER);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("re-dates the map once a typed custom range has settled, not for each date on the way, and never fetches for it", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();
    await screen.findByText(NEW_WEEK_FOOTER);
    const start = await openCustomStart();

    // Typing "07/10/2026" over "10/10/2026" passes through complete dates
    // of their own first; the list follows each, the map the last.
    fireEvent.change(start, { target: { value: "2026-10-03" } });
    fireEvent.change(start, { target: { value: "2026-10-05" } });
    fireEvent.change(start, { target: { value: "2026-10-07" } });
    expect(
      screen.getByText(/Alert days from 7 Oct 2026 to 16 Oct 2026/)
    ).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-10");

    await waitFor(() => expect(mapPane().dataset.start).toBe("2026-10-07"));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores a bound outside the two weeks to the latest alert day, and refuses an end before the start", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget();
    await screen.findByText(NEW_WEEK_FOOTER);
    const start = await openCustomStart();
    const end = screen.getByLabelText("Custom period end");

    const explainer = /Alert days from 10 Oct 2026 to 16 Oct 2026/;
    // "2026" being typed into the year passes through "0002".
    fireEvent.change(start, { target: { value: "0002-08-01" } });
    expect(screen.getByText(explainer)).toBeTruthy();
    fireEvent.change(end, { target: { value: "2027-01-01" } });
    expect(screen.getByText(explainer)).toBeTruthy();
    // Two weeks before the data's last day is as far as the widget looks.
    expect(start.getAttribute("min")).toBe("2026-10-03");
    fireEvent.change(start, { target: { value: "2026-10-02" } });
    expect(screen.getByText(explainer)).toBeTruthy();
    expect(mapPane().dataset.start).toBe("2026-10-10");
    fireEvent.change(start, { target: { value: "2026-10-03" } });
    expect(
      screen.getByText(/Alert days from 3 Oct 2026 to 16 Oct 2026/)
    ).toBeTruthy();

    // An end before the start is refused, and said to be.
    fireEvent.change(start, { target: { value: "2026-10-12" } });
    fireEvent.change(end, { target: { value: "2026-10-08" } });
    expect(
      screen.getByText(/Alert days from 12 Oct 2026 to 16 Oct 2026/)
    ).toBeTruthy();
    expect(screen.getByText("End must be on or after start.")).toBeTruthy();
    fireEvent.change(end, { target: { value: "2026-10-14" } });
    expect(
      screen.getByText(/Alert days from 12 Oct 2026 to 14 Oct 2026/)
    ).toBeTruthy();
    expect(screen.queryByText("End must be on or after start.")).toBeNull();

    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the rows on show when the wider window fails, with the failure above them", async () => {
    mockedFetch
      .mockResolvedValueOnce(LAGGING)
      .mockRejectedValueOnce(new AlertsListError("unknown"));
    renderWidget();
    await screen.findByText(LAGGING_FOOTER);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the alerts.");
    expect(screen.getByText(LAGGING_FOOTER)).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("retries a failed wider window and lets its rows replace the held ones", async () => {
    mockedFetch
      .mockResolvedValueOnce(LAGGING)
      .mockRejectedValueOnce(new AlertsListError("unknown"))
      .mockResolvedValueOnce(LAGGING_WIDER);
    renderWidget();
    await screen.findByText(LAGGING_FOOTER);

    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(kpi("Alerts since")).toContain("7ha of alerts since 7 Sep")
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    // Both the failed and the retried call asked for the widened window.
    expect(mockedFetch.mock.calls[2][1]).toEqual(mockedFetch.mock.calls[1][1]);
    expect(mockedFetch.mock.calls[2][1].start).toBe("2026-09-07");
  });

  it("offers no Retry for an area the backend does not cover", async () => {
    mockedFetch.mockRejectedValue(
      new AlertsListError("rejected", "Area type not supported")
    );
    renderWidget();
    await screen.findByText("Area type not supported");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches for a viewer too", async () => {
    mockedFetch.mockResolvedValue(toAlertsList(ALERTS_LIST_WIRE));
    renderWidget({ isOwner: false });
    await screen.findByText(NEW_WEEK_FOOTER);
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
