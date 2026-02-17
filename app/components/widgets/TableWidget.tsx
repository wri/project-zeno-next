"use client";
import { useMemo, useState } from "react";
import { toSentenceCase } from "@/app/utils/formatText";
import { Badge, Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { CaretUpIcon, CaretDownIcon } from "@phosphor-icons/react";

const PAGE_SIZE = 20;

interface TableWidgetProps {
  data: Record<string, string | number | boolean>[];
  caption?: string;
}

type SortDir = "asc" | "desc" | null;

export default function TableWidget({ data, caption }: TableWidgetProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const headers = Object.keys(data[0]);

  // Helper function to format numeric values
  const formatValue = (
    value: string | number | boolean
  ): string | number | boolean => {
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

  const sortedData = useMemo(() => {
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
                cursor="pointer"
                _hover={{ color: "fg" }}
                onClick={() => handleSort(key)}
                aria-sort={
                  sortKey === key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <Flex align="center" gap={1} display="inline-flex">
                  {toSentenceCase(key)}
                  {sortKey === key &&
                    (sortDir === "asc" ? (
                      <CaretUpIcon size={12} />
                    ) : (
                      <CaretDownIcon size={12} />
                    ))}
                </Flex>
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {pageData.map(
            (
              row: Record<string, string | number | boolean>,
              rowIndex: number
            ) => (
              <Table.Row key={page * PAGE_SIZE + rowIndex} bg="transparent">
                {headers.map((key: string, cellIndex: number) => {
                  const value = row[key];

                  const isRankKey = key.toLowerCase() === "rank";
                  const isFirstNumericColumn =
                    cellIndex === 0 && typeof value === "number";

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
                          {formatValue(value)}
                        </Badge>
                      </Table.Cell>
                    );
                  }
                  return (
                    <Table.Cell
                      key={key}
                      css={{ "&:nth-child(2)": { fontWeight: "medium" } }}
                    >
                      {formatValue(value)}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            )
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
