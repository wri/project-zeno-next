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

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const updateWidget = vi
  .fn<
    (dashboardId: string, widgetId: string, patch: unknown) => Promise<void>
  >()
  .mockResolvedValue(undefined);
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/dashboards")>()),
  updateWidget: (dashboardId: string, widgetId: string, patch: unknown) =>
    updateWidget(dashboardId, widgetId, patch),
}));

import DashboardWidgetsGrid from "../DashboardWidgetsGrid";
import type {
  Dashboard,
  DashboardSection,
  DashboardWidget,
} from "../../api/schemas";
import useAuthStore from "@/app/store/authStore";

const note = (
  id: string,
  text: string,
  position: number,
  sectionId: string | null = null
): DashboardWidget => ({
  id,
  position,
  widget_type: "text",
  insight_id: null,
  section_id: sectionId,
  config: { text },
  created_at: "2026-09-01T00:00:00Z",
  insight: null,
});

const section = (
  id: string,
  title: string,
  position: number,
  description: string | null = null
): DashboardSection => ({
  id,
  title,
  description,
  position,
  created_at: "2026-09-01T00:00:00Z",
});

const dashboard = (
  sections: DashboardSection[],
  widgets: DashboardWidget[]
): Dashboard => ({
  id: "d1",
  user_id: "u1",
  name: "Brazil",
  description: null,
  is_public: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  aois: [],
  sections,
  widgets,
});

const renderGrid = (d: Dashboard) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetsGrid dashboard={d} />
      </ChakraProvider>
    </QueryClientProvider>
  );

describe("DashboardWidgetsGrid sections", () => {
  beforeEach(() => {
    updateWidget.mockClear();
    useAuthStore.setState({ userId: "u1" });
  });

  it("groups widgets under their section headings, ungrouped content first", () => {
    // Both containers number their widgets from 0 — the flat array's positions
    // collide, so only the grouping puts these in a defensible reading order.
    renderGrid(
      dashboard(
        [section("s1", "Deforestation", 0, "What is driving forest loss.")],
        [
          note("t1", "Top note", 0),
          note("w1", "Grouped first", 0, "s1"),
          note("w2", "Grouped second", 1, "s1"),
        ]
      )
    );

    expect(screen.getByRole("heading", { name: "Deforestation" })).toBeTruthy();
    expect(screen.getByText("What is driving forest loss.")).toBeTruthy();

    const order = ["Top note", "Grouped first", "Grouped second"].map((text) =>
      screen.getByText(text)
    );
    expect(
      order[0].compareDocumentPosition(order[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      order[1].compareDocumentPosition(order[2]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows an owner the section the agent just created and has not filled", () => {
    renderGrid(
      dashboard([section("s1", "Fires", 0)], [note("t1", "Top note", 0)])
    );

    expect(screen.getByRole("heading", { name: "Fires" })).toBeTruthy();
    expect(screen.getByText("Nothing in this section yet.")).toBeTruthy();
  });

  it("hides an empty section from someone else's dashboard", () => {
    useAuthStore.setState({ userId: "someone-else" });
    renderGrid(
      dashboard([section("s1", "Fires", 0)], [note("t1", "Top note", 0)])
    );

    expect(screen.queryByRole("heading", { name: "Fires" })).toBeNull();
    expect(screen.queryByText("Nothing in this section yet.")).toBeNull();
  });

  // The reason drag state lives per container: widget `position` is an index
  // within its own container, so a drag inside a section must renumber that
  // section from 0 and leave the ungrouped list alone. Numbering across the
  // whole flat array would write positions that collide with the top level's.
  it("renumbers only the section a drag happened in", async () => {
    renderGrid(
      dashboard(
        [section("s1", "Deforestation", 0)],
        [
          note("t1", "Top note", 0),
          note("t2", "Second top note", 1),
          note("w1", "Grouped first", 0, "s1"),
          note("w2", "Grouped second", 1, "s1"),
        ]
      )
    );

    const item = (id: string) =>
      document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`)!;

    // Arm the section's second note, then drag it above the section's first.
    fireEvent.pointerDown(
      within(item("w2")).getByLabelText("Drag to reposition")
    );
    fireEvent.dragStart(item("w2"), { dataTransfer: { setData: vi.fn() } });
    fireEvent.dragOver(item("w1"));
    fireEvent.drop(item("w1"));

    // Both of the section's widgets get container-local indices; neither
    // top-level widget is touched.
    await waitFor(() =>
      expect(updateWidget.mock.calls.map((c) => [c[1], c[2]])).toEqual([
        ["w2", { id: "w2", position: 0 }],
        ["w1", { id: "w1", position: 1 }],
      ])
    );
  });

  it("renders no headings for a dashboard that has no sections", () => {
    renderGrid(dashboard([], [note("t1", "Top note", 0)]));

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Top note")).toBeTruthy();
  });
});
