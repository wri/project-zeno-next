"use client";

import { Badge, Table } from "@chakra-ui/react";
import { BUCKETS } from "../../model/config";
import { matrixCategory, ROBUST_FLOOR } from "../../lib/matrix";
import type { MatrixCategory, MatrixRow } from "../../lib/matrix";

const CATEGORY_STYLE: Record<
  MatrixCategory,
  { label: string; palette: string; variant: "subtle" | "outline" }
> = {
  robust: { label: "ROBUST", palette: "green", variant: "subtle" },
  thin: { label: "THIN", palette: "yellow", variant: "subtle" },
  gap: { label: "GAP", palette: "red", variant: "subtle" },
  none: { label: "n/a", palette: "gray", variant: "outline" },
};

/** Categorical count badge (the coverage language used across the tabs). */
export function CategoryBadge({
  category,
  count,
  title,
}: {
  readonly category: MatrixCategory;
  readonly count?: number;
  readonly title?: string;
}) {
  const style = CATEGORY_STYLE[category];
  const showCount =
    count !== undefined && (category === "robust" || category === "thin");
  return (
    <Badge
      colorPalette={style.palette}
      variant={style.variant}
      fontSize="2xs"
      title={title}
    >
      {style.label}
      {showCount ? ` · ${count}` : ""}
    </Badge>
  );
}

/**
 * Type × dimension measurability matrix from the harness-stamped implied
 * checks, bucketed into the design's high-level categories: ROBUST
 * (>= ROBUST_FLOOR cases measurable via a dedicated check — the
 * audit_cases coverage floor), THIN (some coverage, or shared-only, whose
 * failures cannot be attributed), GAP (cases exist, none measurable), n/a
 * (no cases at all — grey row). Hover a cell for the raw counts.
 */
export function CoverageMatrixGrid({ rows }: { readonly rows: MatrixRow[] }) {
  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>type</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">cases</Table.ColumnHeader>
          {BUCKETS.map((bucket) => (
            <Table.ColumnHeader key={bucket} textAlign="center">
              {bucket}
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.label} opacity={row.n === 0 ? 0.5 : 1}>
            <Table.Cell fontSize="xs">{row.label}</Table.Cell>
            <Table.Cell
              textAlign="end"
              fontSize="xs"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {row.n === 0 ? "–" : row.n}
            </Table.Cell>
            {BUCKETS.map((bucket) => {
              const cell = row.cells[bucket];
              const category = matrixCategory(cell, row.n);
              const style = CATEGORY_STYLE[category];
              return (
                <Table.Cell
                  key={bucket}
                  textAlign="center"
                  title={
                    row.n === 0
                      ? "no cases"
                      : `${cell.dedicated} via dedicated checks · ${cell.sharedOnly} shared-only (floor ${ROBUST_FLOOR})`
                  }
                >
                  <Badge
                    colorPalette={style.palette}
                    variant={style.variant}
                    fontSize="2xs"
                  >
                    {style.label}
                    {category === "robust" || category === "thin"
                      ? ` · ${cell.dedicated + cell.sharedOnly}`
                      : ""}
                  </Badge>
                </Table.Cell>
              );
            })}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
