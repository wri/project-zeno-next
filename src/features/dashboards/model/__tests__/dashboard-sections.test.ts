import { describe, expect, it } from "vitest";

import type {
  Dashboard,
  DashboardSection,
  DashboardWidget,
} from "../../api/schemas";
import { widgetContainers } from "../dashboard-sections";

const section = (
  id: string,
  position: number,
  overrides: Partial<DashboardSection> = {}
): DashboardSection => ({
  id,
  title: `Section ${id}`,
  description: null,
  position,
  created_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

const widget = (
  id: string,
  position: number,
  sectionId: string | null = null
): DashboardWidget => ({
  id,
  position,
  widget_type: "text",
  insight_id: null,
  section_id: sectionId,
  config: { text: id },
  created_at: "2026-09-01T00:00:00Z",
  insight: null,
});

const dashboard = (
  sections: DashboardSection[],
  widgets: DashboardWidget[]
): Dashboard => ({
  id: "d1",
  user_id: "u1",
  name: "Test",
  description: null,
  is_public: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  aois: [],
  sections,
  widgets,
});

const ids = (widgets: DashboardWidget[]) => widgets.map((w) => w.id);

describe("widgetContainers", () => {
  it("keeps a section's widgets together despite colliding positions", () => {
    // The trap the flat response sets: positions are per container, so sorting
    // the array by position alone interleaves the two groups as 0,0,1,1.
    const containers = widgetContainers(
      dashboard(
        [section("s1", 0)],
        [
          widget("top-a", 0),
          widget("sec-a", 0, "s1"),
          widget("top-b", 1),
          widget("sec-b", 1, "s1"),
        ]
      )
    );

    expect(containers.map((c) => c.key)).toEqual(["", "s1"]);
    expect(ids(containers[0].widgets)).toEqual(["top-a", "top-b"]);
    expect(ids(containers[1].widgets)).toEqual(["sec-a", "sec-b"]);
  });

  it("renders ungrouped widgets first, then sections in position order", () => {
    const containers = widgetContainers(
      dashboard(
        [section("late", 5), section("early", 1)],
        [widget("w1", 0, "late"), widget("w2", 0, "early"), widget("w3", 0)]
      )
    );

    expect(containers.map((c) => c.key)).toEqual(["", "early", "late"]);
  });

  it("orders each container by position, not by payload order", () => {
    const containers = widgetContainers(
      dashboard([], [widget("second", 1), widget("first", 0)])
    );

    expect(ids(containers[0].widgets)).toEqual(["first", "second"]);
  });

  it("breaks position ties on id so the order is stable across loads", () => {
    const forward = widgetContainers(
      dashboard([], [widget("b", 0), widget("a", 0)])
    );
    const reversed = widgetContainers(
      dashboard([], [widget("a", 0), widget("b", 0)])
    );

    expect(ids(forward[0].widgets)).toEqual(["a", "b"]);
    expect(ids(reversed[0].widgets)).toEqual(["a", "b"]);
  });

  it("shows a widget whose section is missing rather than dropping it", () => {
    const containers = widgetContainers(
      dashboard([], [widget("orphan", 0, "gone")])
    );

    expect(containers).toHaveLength(1);
    expect(ids(containers[0].widgets)).toEqual(["orphan"]);
  });

  it("omits the top level when every widget is in a section", () => {
    const containers = widgetContainers(
      dashboard([section("s1", 0)], [widget("w1", 0, "s1")])
    );

    expect(containers.map((c) => c.key)).toEqual(["s1"]);
  });

  it("hides an empty section by default and keeps it in place for the owner", () => {
    const data = dashboard(
      [section("empty", 0), section("filled", 1)],
      [widget("w1", 0, "filled")]
    );

    expect(widgetContainers(data).map((c) => c.key)).toEqual(["filled"]);
    // In place, not appended: the owner sees the order the agent built.
    expect(
      widgetContainers(data, { keepEmptySections: true }).map((c) => c.key)
    ).toEqual(["empty", "filled"]);
  });

  it("reads a pre-sections payload as one ungrouped container", () => {
    const legacy = dashboard([], [widget("w1", 0), widget("w2", 1)]);
    // A backend without sections omits section_id entirely.
    legacy.widgets = legacy.widgets.map(({ ...w }) => {
      delete (w as Partial<DashboardWidget>).section_id;
      return w;
    });

    const containers = widgetContainers(legacy);
    expect(containers).toHaveLength(1);
    expect(ids(containers[0].widgets)).toEqual(["w1", "w2"]);
  });
});
