"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretRightIcon,
  DownloadSimpleIcon,
  TableIcon,
} from "@phosphor-icons/react";
import type { Dashboard, DatasetRawData } from "@/app/types/dashboard";
import { rowsToCSV, downloadCSV } from "../utils/downloadCsv";

// ---------------------------------------------------------------------------
// Per-dataset raw data table (same style as setup step)
// ---------------------------------------------------------------------------

const MAX_PREVIEW = 10;

function RawDataPreview({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]);
  const preview = rows.slice(0, MAX_PREVIEW);

  return (
    <Box overflowX="auto" maxH="260px" overflowY="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            {columns.map((col) => (
              <Table.ColumnHeader key={col} fontSize="xs">
                {col}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {preview.map((row, ri) => (
            <Table.Row key={ri}>
              {columns.map((col) => (
                <Table.Cell key={col} fontFamily="mono" fontSize="xs">
                  {row[col] == null
                    ? "—"
                    : typeof row[col] === "number"
                      ? (row[col] as number).toLocaleString()
                      : String(row[col])}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {rows.length > MAX_PREVIEW && (
        <Text fontSize="xs" color="fg.muted" mt={1} px={2}>
          Showing {MAX_PREVIEW} of {rows.length} rows
        </Text>
      )}
    </Box>
  );
}

function DatasetSection({ dataset }: { dataset: DatasetRawData }) {
  const handleDownload = () => {
    const columns = dataset.rows.length > 0 ? Object.keys(dataset.rows[0]) : [];
    const csv = rowsToCSV(dataset.rows, columns);
    const slug = dataset.datasetName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadCSV(csv, `${slug}-raw-data.csv`);
  };

  return (
    <Box>
      <Flex mb={2} align="center" justify="space-between">
        <HStack gap={2}>
          <TableIcon size={16} />
          <Heading size="sm" fontWeight="medium">
            {dataset.datasetName}
          </Heading>
          <Badge size="xs" variant="outline">
            {dataset.rows.length} row{dataset.rows.length !== 1 ? "s" : ""}
          </Badge>
        </HStack>
        <Button size="xs" variant="outline" onClick={handleDownload}>
          <DownloadSimpleIcon size={14} /> Download CSV
        </Button>
      </Flex>
      <Box
        rounded="md"
        border="1px solid"
        borderColor="border.muted"
        overflow="hidden"
      >
        <RawDataPreview rows={dataset.rows} />
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  dashboard: Dashboard;
}

export default function DashboardDataTable({ dashboard }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const datasets = dashboard.rawData;
  if (!datasets || datasets.length === 0) return null;

  const totalRows = datasets.reduce((sum, d) => sum + d.rows.length, 0);

  const handleDownloadAll = () => {
    const parts: string[] = [];
    for (const ds of datasets) {
      const columns = ds.rows.length > 0 ? Object.keys(ds.rows[0]) : [];
      parts.push(`# ${ds.datasetName}`);
      parts.push(rowsToCSV(ds.rows, columns));
      parts.push("");
    }
    const slug = dashboard.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadCSV(parts.join("\n"), `${slug || "dashboard"}-all-data.csv`);
  };

  return (
    <Box
      mt={6}
      border="1px solid"
      borderColor="border"
      rounded="md"
      overflow="hidden"
    >
      {/* Collapsible header */}
      <Flex
        as="button"
        w="full"
        px={4}
        py={3}
        align="center"
        gap={2}
        bg="bg.subtle"
        cursor="pointer"
        _hover={{ bg: "bg.muted" }}
        transition="background 0.1s"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
        <TableIcon size={16} />
        <Heading size="sm" fontWeight="medium" flex={1} textAlign="left">
          Raw Data
        </Heading>
        <Badge size="sm" variant="outline">
          {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} ·{" "}
          {totalRows} row{totalRows !== 1 ? "s" : ""}
        </Badge>
      </Flex>

      {/* Expanded: per-dataset tables */}
      {isOpen && (
        <Box px={4} py={4} borderTop="1px solid" borderColor="border">
          <Flex mb={4} justify="space-between" align="center">
            <Text fontSize="sm" color="fg.muted">
              The same raw data shown during setup — one table per dataset.
            </Text>
            {datasets.length > 1 && (
              <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                <DownloadSimpleIcon size={16} /> Download All
              </Button>
            )}
          </Flex>

          <VStack gap={6} align="stretch">
            {datasets.map((ds) => (
              <DatasetSection key={ds.datasetId} dataset={ds} />
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
