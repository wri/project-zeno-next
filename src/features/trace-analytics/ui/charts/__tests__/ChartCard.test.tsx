// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartCard } from "@/src/features/trace-analytics/ui/charts/ChartCard";

function renderCard() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <ChartCard title="Test chart" help="Some help text" info="Some info text">
        <div>Chart body content</div>
      </ChartCard>
    </ChakraProvider>
  );
}

describe("ChartCard fullscreen", () => {
  it("renders children once, no dialog initially", () => {
    renderCard();
    expect(screen.getAllByText("Chart body content")).toHaveLength(1);
  });

  it("opens a fullscreen dialog with the same content on click, and closes it", async () => {
    renderCard();
    fireEvent.click(
      screen.getByRole("button", { name: /view "test chart" fullscreen/i })
    );
    await waitFor(() =>
      expect(screen.getAllByText("Chart body content")).toHaveLength(2)
    );
    expect(screen.getAllByText("Test chart").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() =>
      expect(screen.getAllByText("Chart body content")).toHaveLength(1)
    );
  });
});
