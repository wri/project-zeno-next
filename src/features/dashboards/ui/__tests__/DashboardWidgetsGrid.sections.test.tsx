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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  // Drag-and-drop hit-tests against laid-out boxes, which happy-dom does not
  // compute — so the two containers and their four notes get the geometry the
  // browser would give them: one full-width note per row, stacked.
  const twoContainerLayout = () => {
    const boxes: Record<string, [number, number, number, number]> = {
      // [left, top, right, bottom]
      "zone:": [0, 0, 1000, 200],
      "widget:t1": [0, 0, 1000, 100],
      "widget:t2": [0, 100, 1000, 200],
      "zone:s1": [0, 200, 1000, 400],
      "widget:w1": [0, 200, 1000, 300],
      "widget:w2": [0, 300, 1000, 400],
    };
    return vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        const zone = this.getAttribute("data-drop-zone");
        const widget = this.getAttribute("data-widget-id");
        const box = (zone !== null ? boxes[`zone:${zone}`] : undefined) ??
          (widget ? boxes[`widget:${widget}`] : undefined) ?? [0, 0, 0, 0];
        const [left, top, right, bottom] = box;
        return {
          left,
          top,
          right,
          bottom,
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
          toJSON: () => ({}),
        } as DOMRect;
      });
  };

  const dragTo = (widgetId: string, x: number, y: number) => {
    const item = document.querySelector<HTMLElement>(
      `[data-widget-id="${widgetId}"]`
    )!;
    fireEvent.pointerDown(within(item).getByLabelText("Drag to reposition"), {
      button: 0,
    });
    fireEvent.pointerMove(document, { clientX: x, clientY: y });
    fireEvent.pointerUp(document);
  };

  const fourNotes = () =>
    dashboard(
      [section("s1", "Deforestation", 0)],
      [
        note("t1", "Top note", 0),
        note("t2", "Second top note", 1),
        note("w1", "Grouped first", 0, "s1"),
        note("w2", "Grouped second", 1, "s1"),
      ]
    );

  // Widget `position` is an index within its own container, so a drag inside a
  // section must renumber that section from 0 and leave the ungrouped list
  // alone. Numbering across the whole flat array would write positions that
  // collide with the top level's.
  it("renumbers only the section a drag happened in", async () => {
    twoContainerLayout();
    renderGrid(fourNotes());

    // Drag the section's second note onto the top half of its first.
    dragTo("w2", 500, 210);

    // Both of the section's widgets get container-local indices; neither
    // top-level widget is touched, and neither changes section.
    await waitFor(() =>
      expect(updateWidget.mock.calls.map((c) => [c[1], c[2]])).toEqual([
        ["w2", { id: "w2", position: 0 }],
        ["w1", { id: "w1", position: 1 }],
      ])
    );
  });

  // The move the prototype's cross-container drag performs: the widget's own
  // patch carries the grouping, and both containers renumber from 0.
  it("moves a widget into a section it was dropped on", async () => {
    twoContainerLayout();
    renderGrid(fourNotes());

    // Drop the first top-level note past the end of the section's last card.
    dragTo("t1", 500, 390);

    await waitFor(() =>
      expect(updateWidget.mock.calls.map((c) => [c[1], c[2]])).toEqual([
        ["t1", { id: "t1", position: 2, section_id: "s1" }],
        ["t2", { id: "t2", position: 0 }],
      ])
    );
  });

  // An explicit null is the PATCH's "back to the ungrouped top level" — never
  // an omitted key, which would leave the widget in its section.
  it("ungroups a widget dropped on the top-level panel", async () => {
    twoContainerLayout();
    renderGrid(fourNotes());

    dragTo("w1", 500, 10);

    await waitFor(() =>
      expect(updateWidget.mock.calls.map((c) => [c[1], c[2]])).toEqual([
        ["w1", { id: "w1", position: 0, section_id: null }],
        ["t1", { id: "t1", position: 1 }],
        ["t2", { id: "t2", position: 2 }],
        ["w2", { id: "w2", position: 0 }],
      ])
    );
  });

  it("collapses a section to its heading and back", async () => {
    renderGrid(
      dashboard(
        [section("s1", "Deforestation", 0)],
        [note("w1", "Grouped first", 0, "s1")]
      )
    );

    expect(screen.getByText("Grouped first")).toBeTruthy();

    const toggle = screen.getByRole("button", { name: "Collapse section" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);

    // The heading stays; the widgets go.
    expect(screen.getByRole("heading", { name: "Deforestation" })).toBeTruthy();
    const expand = screen.getByRole("button", { name: "Expand section" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByText("Grouped first")?.closest("[hidden]")
    ).toBeTruthy();

    fireEvent.click(expand);
    expect(
      screen.queryByText("Grouped first")?.closest("[hidden]")
    ).toBeFalsy();
  });

  it("renders no headings for a dashboard that has no sections", () => {
    renderGrid(dashboard([], [note("t1", "Top note", 0)]));

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Top note")).toBeTruthy();
  });
});
