/**
 * Order-preserving two-column packing for the dashboard grid.
 *
 * The grid's cells flow top-to-bottom in the user's arranged order. A
 * full-width cell always gets a row of its own; a run of consecutive
 * half-width cells is dealt into two vertical columns (evens left, odds
 * right). Each column stacks its cards tightly, so a card sits directly
 * under the previous card in its column instead of being pushed down to
 * the tallest neighbour's row edge — the "no gaps" default. Adjacent
 * half-width cells (n, n+1) still land side by side as the intentional
 * comparison pair.
 *
 * Deterministic and content-blind by design: packing depends only on the
 * persisted order and sizes, never on rendered heights, so the layout is
 * stable across loads and doesn't reshuffle as charts animate or data
 * arrives.
 */

export interface PackedCell<T> {
  item: T;
  /** The cell's position in the flat input list (drag-and-drop indexing). */
  index: number;
}

export type PackedSegment<T> =
  | { kind: "full"; cell: PackedCell<T> }
  | { kind: "columns"; left: PackedCell<T>[]; right: PackedCell<T>[] };

/**
 * Split cells into layout segments: one `full` segment per full-width cell,
 * and one `columns` segment per run of consecutive half-width cells.
 */
export function packCells<T>(
  items: readonly T[],
  isFullWidth: (item: T, index: number) => boolean
): PackedSegment<T>[] {
  const segments: PackedSegment<T>[] = [];
  let run: PackedCell<T>[] = [];

  const flushRun = () => {
    if (run.length === 0) return;
    segments.push({
      kind: "columns",
      left: run.filter((_, i) => i % 2 === 0),
      right: run.filter((_, i) => i % 2 === 1),
    });
    run = [];
  };

  items.forEach((item, index) => {
    if (isFullWidth(item, index)) {
      flushRun();
      segments.push({ kind: "full", cell: { item, index } });
    } else {
      run = [...run, { item, index }];
    }
  });
  flushRun();

  return segments;
}
