import { describe, expect, it } from "vitest";

import {
  DashboardSchema,
  DashboardWidgetSchema,
} from "@/app/schemas/api/dashboards/get";

const baseWidget = {
  id: "w-1",
  position: 0,
};

describe("DashboardWidgetSchema", () => {
  it("parses a text widget with its markdown config", () => {
    const widget = DashboardWidgetSchema.parse({
      ...baseWidget,
      widget_type: "text",
      config: { text: "## Notes" },
    });
    expect(widget.config?.text).toBe("## Notes");
  });

  it("parses unknown widget types instead of failing the dashboard", () => {
    const widget = DashboardWidgetSchema.parse({
      ...baseWidget,
      widget_type: "gizmo",
    });
    expect(widget.widget_type).toBe("gizmo");
    expect(widget.config).toBeUndefined();
  });

  it("passes insight provenance parts through", () => {
    const widget = DashboardWidgetSchema.parse({
      ...baseWidget,
      widget_type: "insight",
      insight_id: "ins-1",
      insight: {
        id: "ins-1",
        insight_text: "text",
        charts: [],
        codeact_parts: [{ type: "code_block", content: "YmFzZTY0" }],
        created_at: "2026-07-01T09:00:00",
      },
    });
    expect(widget.insight?.codeact_parts).toEqual([
      { type: "code_block", content: "YmFzZTY0" },
    ]);
  });
});

describe("DashboardSchema", () => {
  it("parses user_id for owner detection and tolerates its absence", () => {
    const base = {
      id: "d-1",
      name: "Paraná",
      is_public: false,
      created_at: "2026-07-01T09:00:00",
      updated_at: "2026-07-01T09:00:00",
      widgets: [],
    };
    expect(DashboardSchema.parse(base).user_id).toBeUndefined();
    expect(
      DashboardSchema.parse({ ...base, user_id: "user-abc" }).user_id
    ).toBe("user-abc");
  });
});
