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
  /**
   * Keep the ungrouped top-level container even when it holds nothing. Set
   * while a drag is in flight: the widget being dragged is the container's
   * last one, and dropping it back has to stay possible.
   */
  keepEmptyTopLevel?: boolean;
}

/**
 * The dashboard's widgets grouped into render containers: the ungrouped
 * top-level list first, then each section in its own order.
 *
 * A widget whose `section_id` names no section in the payload falls back to
 * the top level rather than vanishing — a dangling reference should degrade to
 * a visible widget in the wrong place, never to silently missing content.
 *
 * The empty top-level container is dropped unless `keepEmptyTopLevel` asks
 * for it, so a fully sectioned dashboard opens on its first section rather
 * than a blank band.
 */
export function widgetContainers(
  dashboard: Dashboard,
  {
    keepEmptySections = false,
    keepEmptyTopLevel = false,
  }: ContainerOptions = {}
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
  ].filter(
    (c) =>
      c.widgets.length > 0 ||
      (c.section ? keepEmptySections : keepEmptyTopLevel)
  );
}

/** One section's new place after a drag: an index among the sections. */
export interface SectionMovePatch {
  id: string;
  position: number;
}

/**
 * The patches that move `sectionId` to index `toIndex` among the dashboard's
 * sections, renumbered from 0. `toIndex` counts the list without the dragged
 * section. A section already at its index is left out; a drop that changes
 * nothing returns `[]`.
 */
export function computeSectionMove(
  sections: readonly DashboardSection[],
  sectionId: string,
  toIndex: number
): SectionMovePatch[] {
  const sorted = [...sections].sort(byPosition);
  if (!sorted.some((s) => s.id === sectionId)) return [];
  const ids = sorted.map((s) => s.id).filter((id) => id !== sectionId);
  ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, sectionId);
  const positions = new Map(sorted.map((s) => [s.id, s.position]));
  return ids.flatMap((id, position) =>
    positions.get(id) === position ? [] : [{ id, position }]
  );
}
