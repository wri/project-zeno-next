// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InsightWidget } from "@/app/types/chat";

import useRankingViewStore from "../../model/ranking-view-store";
import { RankingBody } from "../RankingBody";

/** `bars` counties worth 1000, 999, …, then `empty` counties with no loss. */
function rows(bars: number, empty = 0, withShare = true) {
  return Array.from({ length: bars + empty }, (_, i) => ({
    rank: i < bars ? i + 1 : bars + 1,
    aoi_id: `KEN.${i}`,
    name: `County ${i}`,
    parent: i === 1 ? null : "Kenya",
    area_ha: i < bars ? 1000 - i : 0,
    ...(withShare ? { share_pct: i < bars ? 2.5 : 0 } : {}),
  }));
}

const widget = (data: unknown): InsightWidget => ({
  id: "r-1",
  type: "ranked-bar",
  title: "Tree Cover Loss by Area",
  description: "",
  data,
  xAxis: "name",
  yAxis: "area_ha",
  seriesColor: "#DC6C9A",
});

const renderBody = (data: unknown, print = false) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <RankingBody widget={widget(data)} print={print} />
    </ChakraProvider>
  );

beforeEach(() => useRankingViewStore.setState({ pageByWidget: {} }));

describe("RankingBody", () => {
  it("draws ten bars with rank and name, and a pager that counts the bars", () => {
    renderBody(rows(44, 3));

    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByText("County 0")).toBeTruthy();
    expect(screen.getByText("Showing 1–10 of 44")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Previous areas",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    // The areas with no loss are named on the last page only.
    expect(screen.queryByText(/No tree cover loss/)).toBeNull();
  });

  it("pages to the last bars, where the areas with no loss are named", () => {
    renderBody(rows(44, 3));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Next areas" }));
    }

    expect(screen.getByText("Showing 41–44 of 44")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByText(
        "No tree cover loss in 3 areas: County 44, County 45, County 46."
      )
    ).toBeTruthy();
  });

  it("has no pager for ten bars, and names the areas with no loss there", () => {
    renderBody(rows(10, 2));

    expect(screen.queryByText(/Showing/)).toBeNull();
    expect(screen.getByText(/No tree cover loss in 2 areas/)).toBeTruthy();
  });

  it("shows the page share above the bars only when there is more than one page", () => {
    const { unmount } = renderBody(rows(12));
    expect(screen.getByText(/Top 10 areas: .* of all loss/)).toBeTruthy();
    unmount();
    renderBody(rows(10));
    expect(screen.queryByText(/of all loss/)).toBeNull();
  });

  it("gives each row the tooltip text as its label, and a tab stop", () => {
    renderBody(rows(12));

    const first = screen.getAllByRole("listitem")[0];
    expect(first.getAttribute("aria-label")).toBe(
      "County 0, Kenya: 1,000 ha · 2.5% of all loss in the 12 areas"
    );
    expect(first.getAttribute("tabindex")).toBe("0");
    // No parent: the name alone.
    expect(
      screen.getAllByRole("listitem")[1].getAttribute("aria-label")
    ).toMatch(/^County 1: /);
  });

  it("opens the row's tooltip on focus", async () => {
    renderBody(rows(12));

    // Chakra opens the tooltip for keyboard focus only, so tab to the row.
    const first = screen.getAllByRole("listitem")[0];
    fireEvent.keyDown(first, { key: "Tab" });
    fireEvent.focus(first);
    fireEvent.focusIn(first);
    expect(
      await screen.findByText("1,000 ha · 2.5% of all loss in the 12 areas")
    ).toBeTruthy();
  });

  it("opens the row's tooltip on a tap, and closes it on a tap elsewhere", async () => {
    renderBody(rows(12));
    const first = screen.getAllByRole("listitem")[0];

    // What a phone sends for one tap: the lift, then the click and the leave.
    fireEvent.pointerDown(first, { pointerType: "touch" });
    fireEvent.pointerUp(first, { pointerType: "touch" });
    expect(
      await screen.findByText("1,000 ha · 2.5% of all loss in the 12 areas")
    ).toBeTruthy();
    await vi.waitFor(() =>
      expect(first.getAttribute("data-state")).toBe("open")
    );
    fireEvent.click(first, { pointerType: "touch" });
    fireEvent.pointerLeave(first, { pointerType: "touch" });
    // Past the tooltip's close delay, it is still open.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(
      screen.queryByText("1,000 ha · 2.5% of all loss in the 12 areas")
    ).toBeTruthy();

    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    await vi.waitFor(() =>
      expect(
        screen.queryByText("1,000 ha · 2.5% of all loss in the 12 areas")
      ).toBeNull()
    );
  });

  it("leaves the share out when the rows have none", () => {
    renderBody(rows(12, 0, false));

    expect(screen.getAllByRole("listitem")[0].getAttribute("aria-label")).toBe(
      "County 0, Kenya: 1,000 ha"
    );
  });

  it("shows the parent after a name that repeats", () => {
    const data = rows(3);
    data[1].name = data[0].name;
    renderBody(data);

    expect(screen.getAllByText("· Kenya").length).toBeGreaterThan(0);
  });

  describe("in print", () => {
    it("draws the first ten bars, no pager, no tab stops, no labels", () => {
      renderBody(rows(44, 3), true);

      expect(screen.getAllByRole("listitem")).toHaveLength(10);
      expect(screen.queryByRole("button")).toBeNull();
      for (const item of screen.getAllByRole("listitem")) {
        expect(item.getAttribute("tabindex")).toBeNull();
        expect(item.getAttribute("aria-label")).toBeNull();
      }
    });

    it("prints the share after the value, and the note counting every area", () => {
      renderBody(rows(44, 3), true);

      expect(screen.getAllByText("1K ha · 2.5%").length).toBeGreaterThan(0);
      expect(screen.getByText("Top 10 of 47 areas.")).toBeTruthy();
      // The bars do not all fit, so the areas with no loss are not named.
      expect(screen.queryByText(/No tree cover loss/)).toBeNull();
    });

    it("names the areas with no loss only when every bar fits, and needs no note", () => {
      renderBody(rows(8, 2), true);

      expect(screen.getByText(/No tree cover loss in 2 areas/)).toBeTruthy();
      expect(screen.queryByText(/^Top 10/)).toBeNull();
    });

    it("omits the share when the rows have none", () => {
      renderBody(rows(12, 0, false), true);

      expect(screen.queryByText(/%/)).toBeNull();
    });

    it("prints from the first page whatever page the card is on", () => {
      useRankingViewStore.setState({ pageByWidget: { "r-1": 1 } });
      renderBody(rows(44), true);

      expect(screen.getByText("County 0")).toBeTruthy();
    });
  });

  it("throws on rows it cannot read, for the widget's error boundary", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderBody([{ rank: 1 }])).toThrow(/Area ranking/);
    quiet.mockRestore();
  });
});
