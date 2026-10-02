// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardWidgetBoundary from "../DashboardWidgetBoundary";

const Boom = ({ throws }: { throws: boolean }) => {
  if (throws) throw new Error("MapLibre torn down mid-frame");
  return <div>Widget body</div>;
};

describe("DashboardWidgetBoundary", () => {
  beforeEach(() => {
    // React logs the caught error itself; the boundary logs it again on
    // purpose. Neither belongs in the test output.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderBoundary = (throws: boolean, resetKey?: string) =>
    render(
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetBoundary resetKey={resetKey}>
          <Boom throws={throws} />
        </DashboardWidgetBoundary>
      </ChakraProvider>
    );

  it("renders its widget when nothing throws", () => {
    renderBoundary(false);
    expect(screen.getByText("Widget body")).toBeTruthy();
  });

  // The failure this exists for: one widget's teardown must not blank the
  // dashboard around it.
  it("replaces a throwing widget with a card the user can retry", () => {
    const { rerender } = renderBoundary(true);
    expect(
      screen.getByText("This widget could not be displayed.")
    ).toBeTruthy();

    // Retry re-renders the children — now with a body that works.
    rerender(
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetBoundary>
          <Boom throws={false} />
        </DashboardWidgetBoundary>
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Widget body")).toBeTruthy();
  });

  // A card that failed once should not stay broken for the life of the page:
  // the next edit to its config clears the error on its own.
  it("clears the error when the widget's content changes", () => {
    const { rerender } = renderBoundary(true, "config-a");
    expect(
      screen.getByText("This widget could not be displayed.")
    ).toBeTruthy();

    rerender(
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetBoundary resetKey="config-b">
          <Boom throws={false} />
        </DashboardWidgetBoundary>
      </ChakraProvider>
    );

    expect(screen.getByText("Widget body")).toBeTruthy();
  });
});
