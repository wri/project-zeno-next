// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntentTopicHeatmap } from "@/src/features/trace-analytics/ui/charts/IntentTopicHeatmap";
import type { IntentTopicMatrix } from "@/src/features/trace-analytics/lib/analytics/intentTopicMatrix";

/**
 * quantification × Fire:         40 prompts, 30/40 success (75%)
 * quantification × Unclassified: 10 prompts, 2/10 success  (< MIN_RESOLVED)
 * monitoring     × Fire:         20 prompts, 10/20 success (50%)
 * grid average: 42/70 = 60%
 */
const MATRIX: IntentTopicMatrix = {
  intents: ["quantification", "monitoring"],
  topics: ["Fire", "Unclassified"],
  cells: [
    [
      { count: 40, resolved: 40, successes: 30 },
      { count: 10, resolved: 10, successes: 2 },
    ],
    [
      { count: 20, resolved: 20, successes: 10 },
      { count: 0, resolved: 0, successes: 0 },
    ],
  ],
  total: 70,
  maxCount: 40,
  avgSuccessRate: 0.6,
};

function renderHeatmap(onCellClick = vi.fn()) {
  render(
    <ChakraProvider value={defaultSystem}>
      <IntentTopicHeatmap matrix={MATRIX} onCellClick={onCellClick} />
    </ChakraProvider>
  );
  return onCellClick;
}

describe("IntentTopicHeatmap", () => {
  it("defaults to the volume view with counts, switchable to share of total", () => {
    renderHeatmap();
    expect(screen.getByText("40")).toBeDefined();
    expect(screen.getByText("20")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "% of total" }));
    expect(screen.getByText("57.1%")).toBeDefined(); // 40 / 70
    expect(screen.queryByText("40")).toBeNull();
  });

  it("shows rates vs the average in the quality view and suppresses small cells", () => {
    renderHeatmap();
    fireEvent.click(screen.getByRole("button", { name: "Quality" }));
    expect(screen.getByText("75%")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined();
    expect(screen.getByText("·")).toBeDefined(); // n < MIN_RESOLVED
    expect(screen.getByText(/midpoint = 60%/)).toBeDefined();
  });

  it("shows failure counts in the impact view, switchable to shortfall vs average", () => {
    renderHeatmap();
    fireEvent.click(screen.getByRole("button", { name: "Impact" }));
    // absolute failures: 10 (quant × Fire), 8 (quant × Unclassified), 10 (mon × Fire)
    expect(screen.getAllByText("10")).toHaveLength(2);
    expect(screen.getByText("8")).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Shortfall vs average" })
    );
    // excess over the 60% average: 0, 4 and 2 failed turns respectively
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.queryByText("8")).toBeNull();
  });

  it("reports raw intent and topic codes on cell click", () => {
    const onCellClick = renderHeatmap();
    fireEvent.click(screen.getByText("40"));
    expect(onCellClick).toHaveBeenCalledWith("quantification", "Fire");
  });

  it("does not make empty cells clickable", () => {
    const onCellClick = renderHeatmap();
    const emptyCell = screen.getByTitle(
      "Monitoring × Unclassified · 0 prompts · 0.0% of all pairs"
    );
    fireEvent.click(emptyCell);
    expect(onCellClick).not.toHaveBeenCalled();
  });
});
