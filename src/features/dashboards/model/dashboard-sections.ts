import type {
  Dashboard,
  DashboardSection,
  DashboardWidget,
} from "../api/schemas";

/**
 * One render container: the dashboard's ungrouped top level, or one section.
 *
 * The API returns widgets in a single flat array whose `position` is scoped to
 * the widget's container — its section, or the ungrouped top-level list. So
 * `position` alone is not a render order: an ungrouped pair at 0,1 and a
 * section's pair at 0,1 sort into an interleaved 0,0,1,1. Grouping first, then
 * ordering within each group, is the only correct reading of the payload.
 */
export interface WidgetContainer {
  /** React key and drag scope. "" is the ungrouped top level. */
  key: string;
  /** Null for the ungrouped top level. */
  section: DashboardSection | null;
  /** The container's widgets in render order; may be empty. */
  widgets: DashboardWidget[];
}

/** Position order; ties break on id so the result is total and stable. */
function byPosition<T extends { position: number; id: string }>(a: T, b: T) {
  return a.position - b.position || a.id.localeCompare(b.id);
}

export interface ContainerOptions {
  /**
   * Keep sections that hold no widgets. The agent creates a section before it
   * fills one, so an empty section is a normal intermediate state and its
   * owner should see the heading the agent just said it made. A viewer of
   * someone else's dashboard sees only containers that hold something.
   */
  keepEmptySections?: boolean;
}

/**
 * The dashboard's widgets grouped into render containers: the ungrouped
 * top-level list first, then each section in its own order.
 *
 * A widget whose `section_id` names no section in the payload falls back to
 * the top level rather than vanishing — a dangling reference should degrade to
 * a visible widget in the wrong place, never to silently missing content.
 *
 * The empty top-level container is always dropped, so a fully sectioned
 * dashboard opens on its first section rather than a blank band.
 */
export function widgetContainers(
  dashboard: Dashboard,
  { keepEmptySections = false }: ContainerOptions = {}
): WidgetContainer[] {
  const sections = [...dashboard.sections].sort(byPosition);
  const known = new Set(sections.map((s) => s.id));

  const grouped = new Map<string, DashboardWidget[]>();
  for (const widget of dashboard.widgets) {
    const key =
      widget.section_id && known.has(widget.section_id)
        ? widget.section_id
        : "";
    grouped.set(key, [...(grouped.get(key) ?? []), widget]);
  }

  const container = (
    key: string,
    section: DashboardSection | null
  ): WidgetContainer => ({
    key,
    section,
    widgets: [...(grouped.get(key) ?? [])].sort(byPosition),
  });

  return [
    container("", null),
    ...sections.map((section) => container(section.id, section)),
  ].filter((c) => c.widgets.length > 0 || (keepEmptySections && !!c.section));
}
