// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx) — stub it so the
// test environment can parse the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// The card body is not under test; only the pager and collapse state are.
vi.mock("../WidgetMessage", () => ({
  default: ({ widget }: { widget: { title: string } }) => (
    <div>{widget.title}</div>
  ),
}));

import InsightWorkspace from "../InsightWorkspace";
import useInsightStore from "@/app/store/insightStore";
import type { InsightWidget } from "@/app/types/chat";

const chart = (insightId: string, position: number): InsightWidget => ({
  id: `${insightId}-chart-${position}`,
  type: "bar",
  title: `${insightId} chart ${position}`,
  description: "",
  data: [],
  xAxis: "x",
  yAxis: "y",
  insightId,
  chartPosition: position,
});

const renderWorkspace = () =>
  render(
    <ChakraProvider value={defaultSystem}>
      <InsightWorkspace />
    </ChakraProvider>
  );

describe("InsightWorkspace focus", () => {
  beforeEach(() => {
    useInsightStore.getState().clearInsights();
    useInsightStore.setState({ isWorkspaceCollapsed: false });
    useInsightStore.getState().addInsights([chart("i1", 0), chart("i1", 1)]);
  });

  it("publishes the chart on show, following the pager", () => {
    renderWorkspace();
    expect(useInsightStore.getState().focusedWidgetId).toBe("i1-chart-0");

    fireEvent.click(screen.getByLabelText("Next insight"));
    expect(useInsightStore.getState().focusedWidgetId).toBe("i1-chart-1");
  });

  it("moves focus to the new lead when an analysis lands", () => {
    renderWorkspace();
    fireEvent.click(screen.getByLabelText("Next insight"));

    act(() => {
      useInsightStore.getState().addInsights([chart("i2", 0)]);
    });
    expect(useInsightStore.getState().focusedWidgetId).toBe("i2-chart-0");
  });

  it("keeps the collapsed state in the store", () => {
    renderWorkspace();
    fireEvent.click(screen.getByLabelText("Collapse insight"));
    expect(useInsightStore.getState().isWorkspaceCollapsed).toBe(true);
  });

  it("clears focus and collapse on unmount", () => {
    const { unmount } = renderWorkspace();
    fireEvent.click(screen.getByLabelText("Collapse insight"));

    unmount();
    expect(useInsightStore.getState().focusedWidgetId).toBeNull();
    expect(useInsightStore.getState().isWorkspaceCollapsed).toBe(false);
  });
});
