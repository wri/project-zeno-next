// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toAlertsList } from "../../api/alerts";
import { ALERTS_LIST_WIRE } from "../../api/__tests__/fixtures";
import {
  chipRange,
  newWeekHa,
  rowsInRange,
  visibleRows,
  type AlertsChip,
  type AlertsConfidence,
} from "../../lib/alertsWidgets";
import DashboardAlertsList from "../DashboardAlertsList";

const list = toAlertsList(ALERTS_LIST_WIRE);

type ListProps = React.ComponentProps<typeof DashboardAlertsList>;

/** The container's derivation, so the pane is fed what it would really get. */
function propsFor(
  chip: AlertsChip,
  confidence: AlertsConfidence = "all",
  custom?: { start: string; end: string }
): ListProps {
  const range = chipRange(chip, list, custom);
  return {
    status: "ready",
    error: null,
    isFetching: false,
    rows: visibleRows(rowsInRange(list.rows, range), confidence),
    range,
    dataTo: list.dataTo,
    newWeekHa: newWeekHa(list.rows, confidence),
    chip,
    confidence,
    custom: custom ?? null,
    onChip: vi.fn<ListProps["onChip"]>(),
    onConfidence: vi.fn<ListProps["onConfidence"]>(),
    onCustomChange: vi.fn<ListProps["onCustomChange"]>(),
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

describe("DashboardAlertsList", () => {
  it("shows the new week's days with NEW badges, hectares on the chip and totals in the footer", () => {
    renderList();

    const newChip = screen.getByRole("button", { name: /New this week/ });
    expect(newChip.textContent).toContain("50.8 ha");
    expect(newChip.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByText(
        /Alert days from 4 Oct 2026 to 10 Oct 2026, newest first/
      )
    ).toBeTruthy();

    // Header row plus one per day, newest first, each new.
    const rows = rowsOf();
    expect(rows).toHaveLength(1 + 5);
    expect(within(rows[1]).getByText("10 Oct 2026")).toBeTruthy();
    expect(within(rows[5]).getByText("4 Oct 2026")).toBeTruthy();
    expect(screen.getAllByText("NEW")).toHaveLength(5);
    expect(within(rows[1]).getByText("15.5")).toBeTruthy();

    expect(
      screen.getByText("5 alert days · 50.8 ha in this period")
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });

  it("reports chip and confidence choices up, without filtering itself", () => {
    const props = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Last week" }));
    expect(props.onChip).toHaveBeenCalledWith("last-week");
    fireEvent.click(screen.getByRole("button", { name: "Highest" }));
    expect(props.onConfidence).toHaveBeenCalledWith("highest");
    // The rows are the container's; this pane did not change them.
    expect(rowsOf()).toHaveLength(1 + 5);
  });

  it("shows a single tier as its own column, dropping the days with none", () => {
    renderList(propsFor("last-week", "highest"));
    const table = screen.getByRole("table", { name: "Alert days" });
    expect(within(table).getByText("Highest (ha)")).toBeTruthy();
    expect(within(table).queryByText("High (ha)")).toBeNull();
    expect(within(table).queryByText("Total (ha)")).toBeNull();
    // 10–16 Oct has five days; the 15th had no highest-confidence area.
    const dates = rowsOf()
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1].textContent);
    expect(dates).toEqual([
      "16 Oct 2026",
      "14 Oct 2026",
      "12 Oct 2026",
      "10 Oct 2026",
    ]);
    expect(
      screen.getByText("4 alert days · 7.6 ha in this period")
    ).toBeTruthy();
  });

  it("pages at ten rows", () => {
    renderList(
      propsFor("custom", "all", { start: "2026-09-01", end: "2026-10-16" })
    );
    expect(rowsOf()).toHaveLength(1 + 10);
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(
      screen.getByText("14 alert days · 105.7 ha in this period")
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(rowsOf()).toHaveLength(1 + 4);
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(within(rowsOf()[4]).getByText("18 Sep 2026")).toBeTruthy();
  });

  it("shows the custom inputs on the Custom chip and reports a changed bound", () => {
    const props = renderList(
      propsFor("custom", "all", { start: "2026-10-10", end: "2026-10-16" })
    );
    const from = screen.getByLabelText("Custom period start");
    expect(from.getAttribute("value")).toBe("2026-10-10");
    expect(from.getAttribute("max")).toBe("2026-10-16");
    expect(from.getAttribute("min")).toBe("2023-12-01");
    fireEvent.change(from, { target: { value: "2026-10-01" } });
    expect(props.onCustomChange).toHaveBeenCalledWith({
      start: "2026-10-01",
      end: "2026-10-16",
    });
  });

  it("says when the period has no alerts", () => {
    renderList({ rows: [] });
    expect(screen.getByText("No alerts in this period.")).toBeTruthy();
    expect(screen.getByText("0 alert days · 0 ha in this period")).toBeTruthy();
  });

  it("shows a loading state before the first response", () => {
    renderList({
      status: "loading",
      rows: [],
      range: null,
      dataTo: null,
      newWeekHa: 0,
    });
    expect(screen.getByLabelText("Loading alerts")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /New this week/ })
        .hasAttribute("disabled")
    ).toBe(true);
    expect(screen.queryByText(/in this period/)).toBeNull();
  });

  it("shows the failure with a Retry only when it is worth one", () => {
    const retryable = renderList({
      status: "error",
      rows: [],
      error: {
        message:
          "Integrated alerts data is unavailable right now. Please try again in a moment.",
        retryable: true,
      },
    });
    expect(
      screen.getByText(
        "Integrated alerts data is unavailable right now. Please try again in a moment."
      )
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryable.onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers no Retry for an area the backend does not cover", () => {
    renderList({
      status: "error",
      rows: [],
      error: {
        message: "Alerts aren't available for this area.",
        retryable: false,
      },
    });
    expect(
      screen.getByText("Alerts aren't available for this area.")
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("dims the rows on show while a wider window loads", () => {
    renderList({ isFetching: true });
    const table = screen.getByRole("table", { name: "Alert days" });
    expect(table.closest("[aria-busy='true']")).toBeTruthy();
  });

  it("shows a failed wider fetch above the rows it still holds", () => {
    const props = renderList({
      error: { message: "Couldn't load the alerts.", retryable: true },
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the alerts.");
    expect(rowsOf()).toHaveLength(1 + 5);
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });
});
