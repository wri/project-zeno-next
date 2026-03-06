"use client";

import { useState } from "react";
import { Box, Code, Table, Text, VStack } from "@chakra-ui/react";

import type { AnalyticsDataItem } from "../types/stream";
import { extractRows } from "../utils/extractRows";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnalyticsTableProps {
  items: AnalyticsDataItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_DISPLAY_ROWS = 500;

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsTable({ items }: AnalyticsTableProps) {
  return (
    <VStack gap={4} align="stretch">
      {items.map((item, i) => (
        <AnalyticsItemTable key={i} item={item} index={i} />
      ))}
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Single analytics item table
// ---------------------------------------------------------------------------

function AnalyticsItemTable({
  item,
}: {
  item: AnalyticsDataItem;
  index: number;
}) {
  const rows = extractRows(item.data);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const numericCols = columns.filter((col) =>
    rows.some((row) => typeof row[col] === "number"),
  );
  const [showAll, setShowAll] = useState(false);

  const displayRows = showAll ? rows : rows.slice(0, MAX_DISPLAY_ROWS);
  const isTruncated = rows.length > MAX_DISPLAY_ROWS && !showAll;

  return (
    <VStack align="stretch" gap={2}>
      {/* Metadata line */}
      <Text fontSize="sm">
        <Text as="span" fontWeight="medium">
          {item.dataset_name}
        </Text>
        {item.aoi_names.length > 0 && (
          <>
            {" · "}
            <Text as="span" color="fg.muted">
              AOIs: {item.aoi_names.join(", ")}
            </Text>
          </>
        )}
        {" · "}
        <Text as="span" color="fg.muted">
          {item.start_date} to {item.end_date}
        </Text>
      </Text>

      {/* Tabular data */}
      {rows.length > 0 ? (
        <>
          <Box overflowX="auto" maxH="400px" overflowY="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  {columns.map((col) => (
                    <Table.ColumnHeader key={col}>{col}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {displayRows.map((row, ri) => (
                  <Table.Row key={ri}>
                    {columns.map((col) => (
                      <Table.Cell key={col} fontFamily="mono" fontSize="xs">
                        {formatCellValue(row[col])}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {/* Row count + truncation notice */}
          <Text fontSize="xs" color="fg.muted">
            <strong>Rows:</strong> {rows.length}
            {" · "}
            <strong>Columns:</strong> {columns.join(", ")}
            {isTruncated && (
              <>
                {" "}
                (showing first {MAX_DISPLAY_ROWS} —{" "}
                <Text
                  as="span"
                  color="primary.fg"
                  cursor="pointer"
                  textDecoration="underline"
                  onClick={() => setShowAll(true)}
                >
                  show all
                </Text>
                )
              </>
            )}
          </Text>

          {/* Summary statistics */}
          {numericCols.length > 0 && (
            <SummaryStats rows={rows} numericCols={numericCols} />
          )}
        </>
      ) : (
        /* Fallback: show raw JSON when no tabular data */
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            Raw data (no tabular rows found):
          </Text>
          <Code
            as="pre"
            whiteSpace="pre-wrap"
            fontSize="xs"
            p={2}
            overflow="auto"
            maxH="200px"
            display="block"
          >
            {JSON.stringify(item.data, null, 2)}
          </Code>
        </Box>
      )}
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Summary statistics table
// ---------------------------------------------------------------------------

function SummaryStats({
  rows,
  numericCols,
}: {
  rows: Record<string, unknown>[];
  numericCols: string[];
}) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Summary Statistics
      </Text>
      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Stat</Table.ColumnHeader>
              {numericCols.map((col) => (
                <Table.ColumnHeader key={col}>{col}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(["count", "mean", "min", "max"] as const).map((stat) => (
              <Table.Row key={stat}>
                <Table.Cell fontWeight="medium">{stat}</Table.Cell>
                {numericCols.map((col) => {
                  const vals = rows
                    .map((r) => r[col])
                    .filter((v): v is number => typeof v === "number");
                  let result: string;
                  if (stat === "count") {
                    result = String(vals.length);
                  } else if (stat === "mean") {
                    result =
                      vals.length > 0
                        ? (
                            vals.reduce((a, b) => a + b, 0) / vals.length
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : "—";
                  } else if (stat === "min") {
                    result =
                      vals.length > 0
                        ? Math.min(...vals).toLocaleString()
                        : "—";
                  } else {
                    result =
                      vals.length > 0
                        ? Math.max(...vals).toLocaleString()
                        : "—";
                  }
                  return (
                    <Table.Cell key={col} fontFamily="mono" fontSize="xs">
                      {result}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}
