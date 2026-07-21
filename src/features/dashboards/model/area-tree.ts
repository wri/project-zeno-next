import type { AreaPickerRow } from "./area-picker-rows";

/**
 * A picker row resolved into the admin-area hierarchy. GADM src_ids encode
 * ancestry ("PAN" → "PAN.2_1" → "PAN.2.3_1"), so when a search returns both an
 * area and one of its ancestors, the area nests under the deepest matched
 * ancestor. Rows from other sources are always leaf roots.
 */
export interface AreaTreeNode {
  row: AreaPickerRow;
  /** Nesting depth in the rendered tree (0 = top level). */
  depth: number;
  /** Names of the ancestor rows this node nests under, outermost first. */
  ancestorNames: string[];
  children: AreaTreeNode[];
}

export function areaRowKey(
  row: Pick<AreaPickerRow, "source" | "src_id">
): string {
  return `${row.source}:${row.src_id}`;
}

/** GADM ids carry a trailing version marker ("NAM.13_1") that ancestors don't
 * share ("NAM"); strip it before comparing ancestry. */
const GADM_VERSION_SUFFIX = /_\d+$/;

function normalizeGadmId(srcId: string): string {
  return srcId.replace(GADM_VERSION_SUFFIX, "");
}

/** Proper-prefix ancestor keys, deepest first: "PAN.2.3" → ["PAN.2", "PAN"]. */
function gadmAncestorKeys(normalizedId: string): string[] {
  const segments = normalizedId.split(".");
  const keys: string[] = [];
  for (let length = segments.length - 1; length >= 1; length--) {
    keys.push(segments.slice(0, length).join("."));
  }
  return keys;
}

/**
 * Builds the nested area tree from the flat, similarity-ordered result rows.
 * A GADM row becomes a child of the deepest GADM row in `rows` whose
 * normalized id is a proper prefix of its own (skipped levels collapse onto
 * the nearest matched ancestor). Both root order and child order preserve the
 * input order. Input rows are not mutated.
 */
export function buildAreaPickerTree(rows: AreaPickerRow[]): AreaTreeNode[] {
  // First row per normalized id is the canonical owner of that key, so a
  // duplicate id (e.g. two GADM versions) can't double-attach children.
  const ownerByKey = new Map<string, AreaPickerRow>();
  for (const row of rows) {
    if (row.source !== "gadm") continue;
    const key = normalizeGadmId(row.src_id);
    if (!ownerByKey.has(key)) ownerByKey.set(key, row);
  }

  const parentKeyOf = (row: AreaPickerRow): string | null => {
    if (row.source !== "gadm") return null;
    return (
      gadmAncestorKeys(normalizeGadmId(row.src_id)).find((key) =>
        ownerByKey.has(key)
      ) ?? null
    );
  };

  const childrenByParentKey = new Map<string, AreaPickerRow[]>();
  const rootRows: AreaPickerRow[] = [];
  for (const row of rows) {
    const parentKey = parentKeyOf(row);
    if (parentKey === null) {
      rootRows.push(row);
    } else {
      childrenByParentKey.set(parentKey, [
        ...(childrenByParentKey.get(parentKey) ?? []),
        row,
      ]);
    }
  }

  const toNode = (
    row: AreaPickerRow,
    depth: number,
    ancestorNames: string[]
  ): AreaTreeNode => {
    const key = row.source === "gadm" ? normalizeGadmId(row.src_id) : null;
    const childRows =
      key !== null && ownerByKey.get(key) === row
        ? (childrenByParentKey.get(key) ?? [])
        : [];
    return {
      row,
      depth,
      ancestorNames,
      children: childRows.map((child) =>
        toNode(child, depth + 1, [...ancestorNames, row.name])
      ),
    };
  };

  return rootRows.map((row) => toNode(row, 0, []));
}

/**
 * Depth-first list of the visible nodes: descendants of a collapsed node
 * (keyed by `areaRowKey`) are skipped.
 */
export function flattenAreaTree(
  nodes: AreaTreeNode[],
  collapsedKeys: ReadonlySet<string>
): AreaTreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(collapsedKeys.has(areaRowKey(node.row))
      ? []
      : flattenAreaTree(node.children, collapsedKeys)),
  ]);
}

/** Type-column label: GADM rows read "Country"/"Administrative area" (singular,
 * per the nested-area design); other sources keep their source label. */
export function areaTypeLabel(
  row: Pick<AreaPickerRow, "source" | "subtype" | "typeLabel">
): string {
  if (row.source !== "gadm") return row.typeLabel;
  return row.subtype === "country" ? "Country" : "Administrative area";
}
