"use client";
import { useMemo, useState } from "react";
import { toSentenceCase } from "@/app/utils/formatText";
import {
  Badge,
  Box,
  Button,
  chakra,
  Flex,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  CaretUpIcon,
  CaretDownIcon,
  CaretUpDownIcon,
} from "@phosphor-icons/react";

const PAGE_SIZE = 10;

/** Column list after applying an optional preferred order and hidden set. */
export function resolveTableColumns(
  allHeaders: string[],
  columnOrder?: string[],
  hiddenColumns?: string[]
): string[] {
  const hidden = new Set(hiddenColumns);
  return (
    columnOrder
      ? [
          ...columnOrder.filter((key) => allHeaders.includes(key)),
          ...allHeaders.filter((key) => !columnOrder.includes(key)),
        ]
      : allHeaders
  ).filter((key) => !hidden.has(key));
}

interface TableWidgetProps {
  data: Record<string, string | number | boolean>[];
  caption?: string;
  /**
   * Preferred column order (exact key match). Columns not listed keep their
   * original relative order, appended after the ones named here. Generic
   * default (no prop) is `Object.keys(data[0])`, unchanged for every other
   * table.
   */
  columnOrder?: string[];
  /** Columns to omit entirely (exact key match), e.g. internal id fields. */
  hiddenColumns?: string[];
  /** Row predicate for emphasis, e.g. a hierarchy's root/total row. */
  boldRowWhen?: (row: Record<string, string | number | boolean>) => boolean;
  /** Columns to render bold (exact key match), e.g. a derived net/total column. */
  boldColumns?: string[];
}

type SortDir = "asc" | "desc" | null;

export default function TableWidget({
  data,
  caption,
  columnOrder,
  hiddenColumns,
  boldRowWhen,
  boldColumns,
}: TableWidgetProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (!data || data.length === 0) return null;

  const allHeaders = Object.keys(data[0]);
  const headers = resolveTableColumns(allHeaders, columnOrder, hiddenColumns);

  // Right-align a column when every non-null value in it is numeric, so
  // magnitudes line up digit-for-digit (paired with tabular-nums below).
  const numericColumns = new Set(
    headers.filter((key) =>
      data.every((row) => row[key] == null || typeof row[key] === "number")
    )
  );

  // Helper function to format numeric values. Years are ordinary data, not
  // magnitudes — a thousands separator ("2,017") would misread as a value.
  const formatValue = (
    value: string | number | boolean,
    key?: string
  ): string | number | boolean => {
    if (key?.toLowerCase() === "year") return value;
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US").format(value)
      : value;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Cycle: asc → desc → none
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const needsPagination = sortedData.length > PAGE_SIZE;
  const pageData = needsPagination
    ? sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : sortedData;

  return (
    <Box>
      <Table.Root
        variant="line"
        striped
        bg="transparent"
        size="sm"
        aria-label={caption || "Data table"}
      >
        {caption && (
          <Table.Caption
            textAlign="left"
            mt={0}
            mb={2}
            fontSize="xs"
            color="fg.muted"
            css={{ captionSide: "top" }}
          >
            {caption}
          </Table.Caption>
        )}
        <Table.Header>
          <Table.Row>
            {headers.map((key: string) => (
              <Table.ColumnHeader
                key={key}
                color="neutral.500"
                fontWeight="normal"
                whiteSpace="pre"
                scope="col"
                textAlign={numericColumns.has(key) ? "end" : undefined}
                aria-sort={
                  sortKey === key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <chakra.button
                  type="button"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  cursor="pointer"
                  color="inherit"
                  onClick={() => handleSort(key)}
                  _hover={{ color: "fg" }}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: "primary.focusRing",
                    outlineOffset: "1px",
                    borderRadius: "xs",
                  }}
                  aria-label={`Sort by ${toSentenceCase(key)}`}
                >
                  {toSentenceCase(key)}
                  {sortKey === key ? (
                    sortDir === "asc" ? (
                      <CaretUpIcon size={12} />
                    ) : (
                      <CaretDownIcon size={12} />
                    )
                  ) : (
                    <Box as="span" color="neutral.400" aria-hidden="true">
                      <CaretUpDownIcon size={12} />
                    </Box>
                  )}
                </chakra.button>
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {pageData.map(
            (
              row: Record<string, string | number | boolean>,
              rowIndex: number
            ) => {
              const isBoldRow = boldRowWhen?.(row) ?? false;
              return (
                <Table.Row key={page * PAGE_SIZE + rowIndex} bg="transparent">
                  {headers.map((key: string, cellIndex: number) => {
                    const value = row[key];

                    const isRankKey = key.toLowerCase() === "rank";
                    // Years are ordinary data, not ranks — don't badge them.
                    const isFirstNumericColumn =
                      cellIndex === 0 &&
                      typeof value === "number" &&
                      key.toLowerCase() !== "year";

                    if (isRankKey || isFirstNumericColumn) {
                      return (
                        <Table.Cell key={key} textAlign="center">
                          <Badge
                            colorPalette="primary"
                            px={2}
                            py={1}
                            borderRadius="full"
                            variant="solid"
                          >
                            {formatValue(value, key)}
                          </Badge>
                        </Table.Cell>
                      );
                    }
                    return (
                      <Table.Cell
                        key={key}
                        textAlign={numericColumns.has(key) ? "end" : undefined}
                        css={{
                          "&:nth-child(2)": { fontWeight: "medium" },
                          fontVariantNumeric: "tabular-nums",
                        }}
                        fontWeight={
                          isBoldRow
                            ? "bold"
                            : boldColumns?.includes(key)
                              ? "medium"
                              : undefined
                        }
                      >
                        {formatValue(value, key)}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              );
            }
          )}
        </Table.Body>
      </Table.Root>
      {needsPagination && (
        <Flex align="center" justify="space-between" mt={2} px={1}>
          <Text fontSize="xs" color="fg.muted">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, sortedData.length)} of{" "}
            {sortedData.length}
          </Text>
          <Flex gap={1}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}
