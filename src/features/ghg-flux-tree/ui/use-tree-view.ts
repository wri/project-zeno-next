import { useCallback, useEffect, useMemo } from "react";

import useTreeViewStore, { DEFAULT_MEASURE } from "../model/tree-view-store";
import {
  expandableIds,
  isFullyExpanded,
  visibleRows,
  type FluxMeasure,
  type FluxNode,
} from "../model/hierarchy";

/**
 * Driving adapter for the tree-view store: binds measure + expansion to React
 * and derives the visible rows. Lives in `ui` rather than `model` because
 * `model` is the framework-free core (ADR 0010).
 *
 * The expansion set is seeded fully-expanded on first render — the design's
 * frames are all drawn at full detail, and "summary"/"categories" are just
 * collapsed states the user can reach from there.
 */
export function useTreeView(widgetId: string, nodes: FluxNode[]) {
  const view = useTreeViewStore((s) => s.byWidget[widgetId]);
  const setMeasureRaw = useTreeViewStore((s) => s.setMeasure);
  const seedExpanded = useTreeViewStore((s) => s.seedExpanded);
  const toggleNodeRaw = useTreeViewStore((s) => s.toggleNode);

  const allExpandable = useMemo(() => expandableIds(nodes), [nodes]);

  // Seed once per widget. Runs in an effect rather than during render so the
  // store isn't written mid-render.
  useEffect(() => {
    if (allExpandable.length > 0) seedExpanded(widgetId, allExpandable);
  }, [seedExpanded, widgetId, allExpandable]);

  const measure: FluxMeasure = view?.measure ?? DEFAULT_MEASURE;
  // Before the seed lands, treat everything as open so the first paint matches
  // the settled state instead of flashing a collapsed tree.
  const expanded = useMemo(
    () => new Set(view?.expanded ?? allExpandable),
    [view?.expanded, allExpandable]
  );

  const rows = useMemo(() => visibleRows(nodes, expanded), [nodes, expanded]);
  const fullyExpanded = useMemo(
    () => isFullyExpanded(nodes, expanded),
    [nodes, expanded]
  );

  const setMeasure = useCallback(
    (next: FluxMeasure) => setMeasureRaw(widgetId, next),
    [setMeasureRaw, widgetId]
  );
  const toggleNode = useCallback(
    (nodeId: string) => toggleNodeRaw(widgetId, nodeId),
    [toggleNodeRaw, widgetId]
  );

  return { measure, setMeasure, rows, toggleNode, fullyExpanded };
}
