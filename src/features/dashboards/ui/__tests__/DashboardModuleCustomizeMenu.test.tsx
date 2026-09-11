// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardModuleCustomizeMenu from "../DashboardModuleCustomizeMenu";

const charts = [
  { id: "c-1", title: "Alerts trend", shown: true },
  { id: "c-2", title: "Alerts by driver", shown: false },
];

function renderMenu({
  summaryAvailable = true,
  summaryShown = true,
  onToggleSummary = vi.fn(),
  onToggleChart = vi.fn(),
} = {}) {
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardModuleCustomizeMenu
        summaryAvailable={summaryAvailable}
        summaryShown={summaryShown}
        charts={charts}
        onToggleSummary={onToggleSummary}
        onToggleChart={onToggleChart}
      />
    </ChakraProvider>
  );
  return { onToggleSummary, onToggleChart };
}

const openMenu = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Customize" }));
  return screen.findByRole("checkbox", { name: "Chart · Alerts trend" });
};

// Clicking the hidden input toggles it and zag reads the new value in its
// click handler; the onCheckedChange callback lands after the machine's
// scheduled flush, hence the waitFor around the toggle assertions below.
const toggleCheckbox = (el: Element) => {
  fireEvent.click(el);
};

describe("DashboardModuleCustomizeMenu", () => {
  it("lists the summary and one type-labelled row per chart, all charts included", async () => {
    renderMenu();
    await openMenu();
    expect(
      screen.getByRole("checkbox", { name: "AI generated summary" })
    ).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "Chart · Alerts by driver" })
    ).toBeTruthy();
  });

  it("reflects shown state as checked", async () => {
    renderMenu({ summaryShown: false });
    await openMenu();
    expect(
      (
        screen.getByRole("checkbox", {
          name: "AI generated summary",
        }) as HTMLInputElement
      ).checked
    ).toBe(false);
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Chart · Alerts trend",
        }) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Chart · Alerts by driver",
        }) as HTMLInputElement
      ).checked
    ).toBe(false);
  });

  it("toggles a chart with its next visibility and keeps the panel open", async () => {
    const { onToggleChart } = renderMenu();
    await openMenu();
    toggleCheckbox(
      screen.getByRole("checkbox", { name: "Chart · Alerts trend" })
    );
    await waitFor(() =>
      expect(onToggleChart).toHaveBeenCalledWith("c-1", false)
    );
    toggleCheckbox(
      screen.getByRole("checkbox", { name: "Chart · Alerts by driver" })
    );
    await waitFor(() =>
      expect(onToggleChart).toHaveBeenCalledWith("c-2", true)
    );
    // The popover stays open across toggles: rows are still in the document.
    expect(
      screen.getByRole("checkbox", { name: "Chart · Alerts trend" })
    ).toBeTruthy();
  });

  it("toggles the summary with its next visibility", async () => {
    const { onToggleSummary } = renderMenu();
    await openMenu();
    toggleCheckbox(
      screen.getByRole("checkbox", { name: "AI generated summary" })
    );
    await waitFor(() => expect(onToggleSummary).toHaveBeenCalledWith(false));
  });

  it("omits the summary row when the insight has no narrative", async () => {
    renderMenu({ summaryAvailable: false });
    await openMenu();
    expect(
      screen.queryByRole("checkbox", { name: "AI generated summary" })
    ).toBe(null);
  });
});
