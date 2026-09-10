import type { WidgetContainer } from "./dashboard-sections";

/**
 * One widget's new place after a drag. `position` is an index inside the
 * widget's own container, and `section_id` rides along only for the widget
 * that changed container — the PATCH reads an omitted key as "leave the
 * grouping alone" and an explicit `null` as "move to the top level", so the
 * key must never be written speculatively.
 */
export interface WidgetMovePatch {
  id: string;
  position: number;
  section_id?: string | null;
}

/** The container list, as ids, keyed by container key. */
function idsByContainer(containers: readonly WidgetContainer[]) {
  return new Map(containers.map((c) => [c.key, c.widgets.map((w) => w.id)]));
}

/**
 * The patches that move `widgetId` to index `toIndex` of the container keyed
 * `toKey` — the one write the drag-and-drop grid performs.
 *
 * Positions are renumbered from 0 in each container the move touched, and only
 * in those: a widget's `position` is an index within its own container, so
 * numbering across the flat `widgets` array would write positions that collide
 * with another container's. A widget that already sits at its new index is left
 * out of the result.
 *
 * `toIndex` counts against the target container *without* the dragged widget in
 * it, which is what a drop slot means for both a move across containers and a
 * reorder inside one.
 *
 * Returns `[]` for a drop that changes nothing, and for a widget the containers
 * don't hold.
 */
export function computeWidgetMove(
  containers: readonly WidgetContainer[],
  widgetId: string,
  toKey: string,
  toIndex: number
): WidgetMovePatch[] {
  const from = containers.find((c) => c.widgets.some((w) => w.id === widgetId));
  const to = containers.find((c) => c.key === toKey);
  if (!from || !to) return [];

  const lists = idsByContainer(containers);
  const source = lists.get(from.key)!.filter((id) => id !== widgetId);
  const target = from.key === to.key ? source : lists.get(to.key)!.slice();
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, widgetId);

  const moved = from.key !== to.key;
  if (!moved && target.every((id, i) => id === lists.get(to.key)![i]))
    return [];

  const positions = new Map(
    containers.flatMap((c) => c.widgets.map((w) => [w.id, w.position] as const))
  );
  const patches = (ids: string[]) =>
    ids.flatMap((id, position) => {
      const grouping =
        moved && id === widgetId ? { section_id: to.key || null } : {};
      // A widget already at its index still needs the PATCH when its grouping
      // changed — that is the whole move.
      if (positions.get(id) === position && !("section_id" in grouping))
        return [];
      return [{ id, position, ...grouping }];
    });

  return moved ? [...patches(target), ...patches(source)] : patches(target);
}
