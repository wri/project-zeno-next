import { describe, expect, it } from "vitest";

import type { DashboardWidget } from "../../api/schemas";
import type { WidgetContainer } from "../dashboard-sections";
import { computeWidgetMove } from "../widget-move";

const widget = (id: string, position: number, sectionId: string | null) =>
  ({
    id,
    position,
    widget_type: "text",
    section_id: sectionId,
    config: {},
    created_at: "2026-09-01T00:00:00Z",
    insight: null,
  }) as DashboardWidget;

/** Two containers: the top level holds a,b; section s1 holds x,y. */
const containers = (): WidgetContainer[] => [
  {
    key: "",
    section: null,
    widgets: [widget("a", 0, null), widget("b", 1, null)],
  },
  {
    key: "s1",
    section: {
      id: "s1",
      title: "Fires",
      description: null,
      position: 0,
      created_at: "2026-09-01T00:00:00Z",
    },
    widgets: [widget("x", 0, "s1"), widget("y", 1, "s1")],
  },
];

describe("computeWidgetMove", () => {
  it("renumbers one container for a reorder inside it", () => {
    expect(computeWidgetMove(containers(), "b", "", 0)).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
  });

  it("is a no-op when the widget lands back on its own slot", () => {
    expect(computeWidgetMove(containers(), "a", "", 0)).toEqual([]);
  });

  it("carries the section on the moved widget and renumbers both containers", () => {
    expect(computeWidgetMove(containers(), "a", "s1", 1)).toEqual([
      // The target, in its new order: x keeps position 0, so only the arrival
      // and the shifted y are written.
      { id: "a", position: 1, section_id: "s1" },
      { id: "y", position: 2 },
      // The source closes the gap the move left.
      { id: "b", position: 0 },
    ]);
  });

  it("writes an explicit null for a move back to the top level", () => {
    const patches = computeWidgetMove(containers(), "x", "", 2);
    expect(patches[0]).toEqual({ id: "x", position: 2, section_id: null });
    expect(patches).toContainEqual({ id: "y", position: 0 });
  });

  it("patches a widget whose index did not change but whose section did", () => {
    // `a` is index 0 of the top level and lands on index 0 of the section:
    // the position is unchanged, so only the grouping makes this a write.
    expect(computeWidgetMove(containers(), "a", "s1", 0)).toContainEqual({
      id: "a",
      position: 0,
      section_id: "s1",
    });
  });

  it("clamps a slot past the end of the target container", () => {
    expect(computeWidgetMove(containers(), "a", "s1", 99)).toContainEqual({
      id: "a",
      position: 2,
      section_id: "s1",
    });
  });

  it("ignores a widget or a container it doesn't hold", () => {
    expect(computeWidgetMove(containers(), "nope", "s1", 0)).toEqual([]);
    expect(computeWidgetMove(containers(), "a", "s9", 0)).toEqual([]);
  });
});
