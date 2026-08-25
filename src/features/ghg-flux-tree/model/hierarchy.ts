import type { InsightWidget } from "@/app/types/chat";

/**
 * The hierarchical GHG-flux node list, as the API serves it.
 *
 * Both value fields are *gross* at every level and `null` where the metric
 * structurally does not apply (organic soil and agriculture have no removals;
 * tree gain has no emissions). Removals arrive negative, so a node's net flux
 * is simply the sum of the two. Parent values come from the API as given —
 * nothing here re-derives a parent from its children.
 */
export interface FluxNode {
  id: string;
  parentId: string | null;
  label: string;
  /** Gross emissions, positive. Null when the metric doesn't apply. */
  avgEmissions: number | null;
  /** Gross removals, negative. Null when the metric doesn't apply. */
  avgRemovals: number | null;
}

export type FluxMeasure = "net" | "gross";

/**
 * This slice is the only producer of the chart type, so the type doubles as the
 * discriminator for its bespoke rendering path.
 */
export function isFluxTreeWidget(widget: InsightWidget): boolean {
  return widget.type === "hierarchical-bar";
}

/** A node paired with its position in the visible tree. */
export interface FluxRow {
  node: FluxNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  /** Gross emissions + gross removals; null when neither applies. */
  net: number | null;
}

/** Net flux for a node: the two gross figures summed (removals are negative). */
export function nodeNet(node: FluxNode): number | null {
  const { avgEmissions, avgRemovals } = node;
  if (avgEmissions == null && avgRemovals == null) return null;
  return (avgEmissions ?? 0) + (avgRemovals ?? 0);
}

/**
 * Which single-sided annotation a node warrants in the gross view — the design
 * labels these rows "emissions only" / "removals only" and draws `n/a` on the
 * empty side.
 */
export function singleSidedLabel(
  node: FluxNode
): "emissions only" | "removals only" | null {
  if (node.avgEmissions != null && node.avgRemovals == null) {
    return "emissions only";
  }
  if (node.avgRemovals != null && node.avgEmissions == null) {
    return "removals only";
  }
  return null;
}

export function childrenByParent(
  nodes: FluxNode[]
): Map<string | null, FluxNode[]> {
  const index = new Map<string | null, FluxNode[]>();
  for (const node of nodes) {
    const siblings = index.get(node.parentId);
    if (siblings) siblings.push(node);
    else index.set(node.parentId, [node]);
  }
  return index;
}

type FluxMetric = "avgEmissions" | "avgRemovals";

/** A parent's stored value disagreeing with the sum of its children's. */
export interface ReconciliationIssue {
  nodeId: string;
  label: string;
  metric: FluxMetric;
  parentValue: number;
  childrenSum: number;
  diff: number;
}

/**
 * An *internal* self-consistency check: does each parent's own reported value
 * match the sum of its own children, within this single tree payload? This is
 * not the cross-source check PZB-1185's Q3 actually asks for — "does a
 * rolled-up figure still reconcile with the dashboard chart figures ... within
 * an acceptable tolerance" compares against an independently-derived number,
 * which this function has no access to. Treat this as an early-warning proxy
 * (a tree that doesn't even sum against itself is unlikely to reconcile with
 * anything else), not as an answer to Q3. This chart's `FluxNode` doc already
 * states parent values arrive from the API as given — nothing here re-derives
 * one from its children — so this function only *flags* disagreement; it
 * never corrects it.
 *
 * A child's missing side is treated as 0 (matching `nodeNet`), and a parent
 * whose own value is `null` is skipped rather than reported as a mismatch,
 * since the metric doesn't apply at that level.
 *
 * `tolerance` is an absolute allowance on |parent - Σchildren|. The ticket
 * leaves the acceptable tolerance for a resampled/aggregated rollup as an
 * open product question — the default here is a placeholder for wiring this
 * up, not a validated threshold. Note it's small relative to these values
 * (hundreds to low thousands of MgCO2e/yr), so in practice it behaves close
 * to zero-tolerance until a real threshold is set.
 */
export function reconciliationIssues(
  nodes: FluxNode[],
  tolerance = 1
): ReconciliationIssue[] {
  const index = childrenByParent(nodes);
  const issues: ReconciliationIssue[] = [];

  for (const node of nodes) {
    const children = index.get(node.id) ?? [];
    if (children.length === 0) continue;

    for (const metric of ["avgEmissions", "avgRemovals"] as const) {
      const parentValue = node[metric];
      if (parentValue == null) continue;

      const childValues = children
        .map((c) => c[metric])
        .filter((v): v is number => v != null);
      if (childValues.length === 0) continue;

      const childrenSum = childValues.reduce((a, b) => a + b, 0);
      const diff = parentValue - childrenSum;
      if (Math.abs(diff) > tolerance) {
        issues.push({
          nodeId: node.id,
          label: node.label,
          metric,
          parentValue,
          childrenSum,
          diff,
        });
      }
    }
  }

  return issues;
}

/**
 * Depth-first walk of the tree, emitting only rows whose ancestors are all
 * expanded. Node order within a level follows the order the API sent, so the
 * backend keeps control of presentation order.
 */
export function visibleRows(
  nodes: FluxNode[],
  expanded: ReadonlySet<string>
): FluxRow[] {
  const index = childrenByParent(nodes);
  const rows: FluxRow[] = [];

  const walk = (parentId: string | null, depth: number) => {
    for (const node of index.get(parentId) ?? []) {
      const children = index.get(node.id) ?? [];
      const isExpanded = expanded.has(node.id);
      rows.push({
        node,
        depth,
        hasChildren: children.length > 0,
        expanded: isExpanded,
        net: nodeNet(node),
      });
      if (children.length > 0 && isExpanded) walk(node.id, depth + 1);
    }
  };

  walk(null, 0);
  return rows;
}

/** Every node with children — the fully-expanded expansion set. */
export function expandableIds(nodes: FluxNode[]): string[] {
  const parents = new Set(
    nodes.map((n) => n.parentId).filter((id): id is string => id !== null)
  );
  return nodes.filter((n) => parents.has(n.id)).map((n) => n.id);
}

/** True when nothing is left to open — drives the "Full detail" suffix. */
export function isFullyExpanded(
  nodes: FluxNode[],
  expanded: ReadonlySet<string>
): boolean {
  return expandableIds(nodes).every((id) => expanded.has(id));
}

/** The tree's root nodes (the design shows a single "All land" root). */
export function rootNodes(nodes: FluxNode[]): FluxNode[] {
  return nodes.filter((n) => n.parentId === null);
}

function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Anti-corruption layer for the chart's row shape. `chartsToWidgets` passes
 * `chart_data` through untouched, so rows arrive in the backend's snake_case;
 * this is the single place that knows those key names.
 */
export function parseFluxNodes(data: unknown): FluxNode[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const id = row.id;
    if (typeof id !== "string" || id === "") return [];
    const parentId = row.parent_id;
    return [
      {
        id,
        parentId: typeof parentId === "string" && parentId ? parentId : null,
        label: typeof row.label === "string" ? row.label : id,
        avgEmissions: readNumber(row.avg_emissions),
        avgRemovals: readNumber(row.avg_removals),
      },
    ];
  });
}
