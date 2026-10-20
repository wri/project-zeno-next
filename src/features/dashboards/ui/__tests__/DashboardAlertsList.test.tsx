// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toAlertsList } from "../../api/alerts";
import { ALERTS_LIST_WIRE } from "../../api/__tests__/fixtures";
import {
  alertsHeadline,
  chipRange,
  rowsInRange,
  visibleRows,
  type AlertsChip,
  type AlertsConfidence,
} from "../../lib/alertsWidgets";
import type { DateRange } from "@/src/shared/lib/iso-date";
import { chooseFromMenu } from "./chakraMenu";
import DashboardAlertsList, {
  type AlertsFailure,
  type AlertsListView,
} from "../DashboardAlertsList";

const list = toAlertsList(ALERTS_LIST_WIRE);

type ListProps = React.ComponentProps<typeof DashboardAlertsList>;

/** The container's `ready` view for a period, as it would really derive it. */
function readyView(range: DateRange, failure?: AlertsFailure): AlertsListView {
  return {
    kind: "ready",
    range,
    anchor: list.anchor,
    failure,
  };
}

/** The container's derivation, so the pane is fed what it would really get. */
function propsFor(
  chip: AlertsChip,
  confidence: AlertsConfidence = "all",
  custom?: DateRange
): ListProps {
  const range = chipRange(chip, list, custom);
  return {
    view: readyView(range),
    isFetching: false,
    rows: visibleRows(rowsInRange(list.rows, range), confidence),
    headline: alertsHeadline(list, confidence),
    chip,
    confidence,
    landFilter: "any",
    custom,
    mapPane: <div data-testid="map-pane" />,
    sideBySide: true,
    onChip: vi.fn<ListProps["onChip"]>(),
    onConfidence: vi.fn<ListProps["onConfidence"]>(),
    onLandFilter: vi.fn<ListProps["onLandFilter"]>(),
    onCustomChange: vi.fn<ListProps["onCustomChange"]>(),
    onDownloadCsv: vi.fn<ListProps["onDownloadCsv"]>(),
    onRetry: vi.fn<ListProps["onRetry"]>(),
  };
}

const renderList = (props: Partial<ListProps> = {}) => {
  const merged: ListProps = { ...propsFor("new-week"), ...props };
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardAlertsList {...merged} />
    </ChakraProvider>
  );
  return merged;
};

const rowsOf = () =>
  within(screen.getByRole("table", { name: "Alert days" })).getAllByRole("row");

const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

const UNAVAILABLE =
  "Integrated alerts data is unavailable right now. Please try again in a moment.";

const dropdown = (name: string) => screen.getByRole("button", { name });

const kpi = (name: string) => screen.getByRole("group", { name }).textContent;

describe("DashboardAlertsList", () => {
  it("shows the headline figures, the new week's days with NEW badges, and totals in the footer", () => {
    renderList();

    // The new week's hectares with the week it covers; the two weeks to the
    // latest alert day, said to be counted to it.
    expect(kpi("New this week")).toBe(
      "50.8ha new this weekDATED 4 – 10 OCT 2026"
    );
    expect(kpi("Alerts since")).toBe(
      "71ha of alerts since 3 Oct3 – 16 OCT 2026 · COUNTED TO LATEST UPDATE"
    );
    const newPill = screen.getByRole("button", { name: "New this week" });
    expect(newPill.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByText(
        /Alert days from 4 Oct 2026 to 10 Oct 2026, newest first/
      )
    ).toBeTruthy();

    // The Stage 1 columns: badge, date, the tiers the day had, its area.
    const table = screen.getByRole("table", { name: "Alert days" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent)
    ).toEqual(["", "Alert date", "Confidence", "Total area (ha)"]);
    const rows = rowsOf();
    expect(rows).toHaveLength(1 + 5);
    expect(cellsOf(rows[1])).toEqual([
      "NEW",
      "10 Oct 2026",
      "High · Highest",
      "15.5",
    ]);
    expect(cellsOf(rows[5])).toEqual([
      "NEW",
      "4 Oct 2026",
      "High · Highest",
      "1.5",
    ]);
    expect(screen.getAllByText("NEW")).toHaveLength(5);

    expect(
      screen.getByText("5 alert days · 50.8 ha in this period")
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
    // The map pane the container passes in sits in the same card.
    expect(screen.getByTestId("map-pane")).toBeTruthy();
  });

  it("gives the headline figures in the shown tier", () => {
    renderList(propsFor("new-week", "highest"));
    expect(kpi("New this week")).toContain("9.4ha new this week");
    expect(kpi("Alerts since")).toContain("14ha of alerts since 3 Oct");
  });

  it("names only the tiers a day had alerts in", () => {
    renderList(propsFor("last-week"));
    const rows = rowsOf();
    // 15 Oct had no highest-confidence area, 14 Oct no high.
    expect(cellsOf(rows[2])).toEqual(["", "15 Oct 2026", "High", "2.1"]);
    expect(cellsOf(rows[3])).toEqual(["", "14 Oct 2026", "Highest", "1.6"]);
  });

  it("offers New this week, Last week and Custom, and reports chip choices up without filtering itself", () => {
    const props = renderList();
    expect(
      screen
        .getAllByRole("button", { pressed: false })
        .concat(screen.getAllByRole("button", { pressed: true }))
        .map((pill) => pill.textContent)
        .sort()
    ).toEqual(["Custom", "Last week", "New this week"]);
    fireEvent.click(screen.getByRole("button", { name: "Last week" }));
    expect(props.onChip).toHaveBeenCalledWith("last-week");
    // The rows are the container's; this pane did not change them.
    expect(rowsOf()).toHaveLength(1 + 5);
  });

  it("offers the confidence tiers in a dropdown and reports the choice", async () => {
    const props = renderList();
    await chooseFromMenu(dropdown("Confidence: All"), "Highest");
    expect(props.onConfidence).toHaveBeenCalledWith("highest");
  });

  it("offers the land filters in a dropdown and reports the choice", async () => {
    const props = renderList();
    await chooseFromMenu(dropdown("Intersects: Any"), "Natural lands");
    expect(props.onLandFilter).toHaveBeenCalledWith("natural_lands");

    await chooseFromMenu(dropdown("Intersects: Any"), "Any");
    expect(props.onLandFilter).toHaveBeenLastCalledWith("any");
  });

  it("shows a single tier in the cells, dropping the days with none, and names the land filter", () => {
    renderList({
      ...propsFor("last-week", "highest"),
      landFilter: "natural_lands",
    });
    expect(
      screen.getByRole("button", { name: "Confidence: Highest" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Intersects: Natural lands" })
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Alert days from 10 Oct 2026 to 16 Oct 2026, on natural lands, newest first/
      )
    ).toBeTruthy();
    // 10–16 Oct has five days; the 15th had no highest-confidence area.
    const rows = rowsOf().slice(1);
    expect(rows.map((row) => cellsOf(row)[1])).toEqual([
      "16 Oct 2026",
      "14 Oct 2026",
      "12 Oct 2026",
      "10 Oct 2026",
    ]);
    expect(rows.map((row) => cellsOf(row)[2])).toEqual([
      "Highest",
      "Highest",
      "Highest",
      "Highest",
    ]);
    expect(cellsOf(rows[0])[3]).toBe("0.8");
    expect(
      screen.getByText("4 alert days · 7.6 ha in this period")
    ).toBeTruthy();
  });

  it("pages at ten rows with numbered pages", () => {
    renderList(
      propsFor("custom", "all", { start: "2026-09-01", end: "2026-10-16" })
    );
    expect(rowsOf()).toHaveLength(1 + 10);
    expect(
      screen.getByText(
        "Showing 1–10 of 14 alert days · 105.7 ha in this period"
      )
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Page 1" })
        .getAttribute("aria-current")
    ).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(rowsOf()).toHaveLength(1 + 4);
    expect(
      screen.getByText(
        "Showing 11–14 of 14 alert days · 105.7 ha in this period"
      )
    ).toBeTruthy();
    expect(cellsOf(rowsOf()[4])[1]).toBe("18 Sep 2026");

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(rowsOf()).toHaveLength(1 + 10);
  });

  it("opens the Start and End dates from the Custom pill, bounded to the two weeks and to each other, and reports a changed bound", async () => {
    const props = renderList(
      propsFor("custom", "all", { start: "2026-10-10", end: "2026-10-16" })
    );
    expect(screen.queryByLabelText("Custom period start")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(props.onChip).toHaveBeenCalledWith("custom");

    const start = await screen.findByLabelText("Custom period start");
    const end = screen.getByLabelText("Custom period end");
    expect(screen.getByText("Start")).toBeTruthy();
    expect(screen.getByText("End")).toBeTruthy();
    expect(start.getAttribute("value")).toBe("2026-10-10");
    // Two weeks back from the data's last day, and no later than the end.
    expect(start.getAttribute("min")).toBe("2026-10-03");
    expect(start.getAttribute("max")).toBe("2026-10-16");
    // No earlier than the start, and no later than the data's last day.
    expect(end.getAttribute("min")).toBe("2026-10-10");
    expect(end.getAttribute("max")).toBe("2026-10-16");

    fireEvent.change(start, { target: { value: "2026-10-05" } });
    expect(props.onCustomChange).toHaveBeenCalledWith({
      start: "2026-10-05",
      end: "2026-10-16",
    });
  });

  it("refuses an end before the start, saying so, and ignores a bound outside the two weeks", async () => {
    const props = renderList(
      propsFor("custom", "all", { start: "2026-10-10", end: "2026-10-16" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    const start = await screen.findByLabelText("Custom period start");
    const end = screen.getByLabelText("Custom period end");

    fireEvent.change(end, { target: { value: "2026-10-08" } });
    expect(props.onCustomChange).not.toHaveBeenCalled();
    expect(screen.getByText("End must be on or after start.")).toBeTruthy();

    fireEvent.change(end, { target: { value: "2026-10-12" } });
    expect(props.onCustomChange).toHaveBeenLastCalledWith({
      start: "2026-10-10",
      end: "2026-10-12",
    });
    expect(screen.queryByText("End must be on or after start.")).toBeNull();

    // A year still being typed, and a start past the two weeks: ignored
    // without comment.
    fireEvent.change(start, { target: { value: "0002-10-05" } });
    fireEvent.change(start, { target: { value: "2026-10-02" } });
    expect(props.onCustomChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("End must be on or after start.")).toBeNull();
  });

  it("says when the period has no alerts", () => {
    renderList({ rows: [] });
    expect(screen.getByText("No alerts in this period.")).toBeTruthy();
    expect(screen.getByText("0 alert days · 0 ha in this period")).toBeTruthy();
  });

  it("shows a loading state before the first response", () => {
    renderList({ view: { kind: "loading" }, rows: [], headline: undefined });
    expect(screen.getByLabelText("Loading alerts")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "New this week" })).toBeNull();
    for (const name of ["New this week", "Last week", "Custom"]) {
      expect(
        screen.getByRole("button", { name }).hasAttribute("disabled")
      ).toBe(true);
    }
    expect(screen.queryByText(/in this period/)).toBeNull();
  });

  it("shows the failure with a Retry only when it is worth one", () => {
    const retryable = renderList({
      view: {
        kind: "error",
        failure: { kind: "unavailable", detail: UNAVAILABLE },
      },
      rows: [],
      headline: undefined,
    });
    expect(screen.getByRole("alert").textContent).toContain(UNAVAILABLE);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryable.onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers no Retry for a reason a retry cannot change", () => {
    renderList({
      view: {
        kind: "error",
        failure: { kind: "rejected", detail: "Area type not supported" },
      },
      rows: [],
      headline: undefined,
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Area type not supported"
    );
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("dims the rows on show while another list loads", () => {
    renderList({ isFetching: true });
    const table = screen.getByRole("table", { name: "Alert days" });
    expect(table.closest("[aria-busy='true']")).toBeTruthy();
  });

  it("offers the rows on show as a CSV download, nothing when there are none", async () => {
    const props = renderList(propsFor("last-week"));
    await chooseFromMenu(dropdown("Download"), "Data (CSV)");
    expect(props.onDownloadCsv).toHaveBeenCalledTimes(1);

    cleanup();
    renderList({ rows: [] });
    expect(dropdown("Download").hasAttribute("disabled")).toBe(true);
  });

  it("shows a failed fetch above the rows it still holds", () => {
    const props = renderList({
      view: readyView(chipRange("new-week", list), { kind: "unknown" }),
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the alerts.");
    expect(rowsOf()).toHaveLength(1 + 5);
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });
});
