"use client";

import { useState } from "react";
import { Box, chakra, Flex, Text } from "@chakra-ui/react";
import { DATASET_COLUMNS } from "../../model/config";
import type {
  IntentCell,
  IntentMatrix,
  IntentRow,
} from "../../lib/intent-matrix";
import { CellDetail } from "./CellDetail";
import { describeCell, MATRIX_SECTION, perfBand } from "./copy";
import { HATCH, PERF_BG, PERF_FG, THIN_OPACITY } from "./tokens";

const Tbl = chakra("table");
const THead = chakra("thead");
const TBody = chakra("tbody");
const Tr = chakra("tr");
const Th = chakra("th");
const Td = chakra("td");

interface Selection {
  intent: string;
  datasetId: string | null;
}

const LABEL_BY_ID = new Map(DATASET_COLUMNS.map((c) => [c.datasetId, c.label]));

function cellKey(row: IntentRow, cell: IntentCell): string {
  return `${row.def.key}:${cell.datasetId ?? "*"}`;
}

/** Best-measured cell: the wireframe opens on it. */
function initialSelection(matrix: IntentMatrix): Selection | null {
  let best: { sel: Selection; score: number } | null = null;
  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      if (cell.rate === null) continue;
      const score = cell.measured * 10 + cell.rate;
      if (!best || score > best.score) {
        best = {
          sel: { intent: row.def.key, datasetId: cell.datasetId },
          score,
        };
      }
    }
  }
  return best?.sel ?? null;
}

function cellText(row: IntentRow, cell: IntentCell): string {
  if (cell.coverage === "none") {
    return row.def.crossCutting ? `· ${row.def.blurb} · evals planned` : "·";
  }
  if (cell.rate === null) return "—";
  const value = String(Math.round(cell.rate * 100));
  return row.def.crossCutting
    ? `${value} · ${row.def.blurb}, measured across all datasets`
    : value;
}

function MatrixCell({
  row,
  cell,
  selected,
  onSelect,
}: {
  readonly row: IntentRow;
  readonly cell: IntentCell;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const band = cell.rate === null ? null : perfBand(cell.rate);
  const none = cell.coverage === "none";
  const label = describeCell({
    intent: row.def,
    datasetLabel: cell.datasetId
      ? (LABEL_BY_ID.get(cell.datasetId) ?? null)
      : null,
    cell,
  })
    .map((s) => s.text)
    .join("");
  return (
    <Td
      colSpan={row.def.crossCutting ? DATASET_COLUMNS.length : undefined}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      w={row.def.crossCutting ? "auto" : "66px"}
      minW={row.def.crossCutting ? undefined : "56px"}
      h="44px"
      px={row.def.crossCutting ? 3 : 1}
      borderRadius="md"
      textAlign={row.def.crossCutting ? "start" : "center"}
      verticalAlign="middle"
      fontFamily="mono"
      fontSize="xs"
      fontWeight={none ? "normal" : "semibold"}
      cursor="pointer"
      bg={band ? PERF_BG[band] : "transparent"}
      color={band ? PERF_FG[band] : "fg.subtle"}
      bgImage={none ? HATCH : undefined}
      borderWidth="1px"
      borderStyle={none || band === null ? "dashed" : "solid"}
      borderColor={
        selected ? "fg" : none || band === null ? "border" : "transparent"
      }
      boxShadow={
        selected ? "inset 0 0 0 1.5px var(--chakra-colors-fg)" : undefined
      }
      opacity={cell.coverage === "thin" ? THIN_OPACITY : 1}
      _hover={{
        outline: "2px solid",
        outlineColor: "primary.solid",
        outlineOffset: "1px",
      }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "primary.solid",
        outlineOffset: "1px",
      }}
    >
      {cellText(row, cell)}
    </Td>
  );
}

/** Layer 3: intent x dataset heatmap with a plain-language cell read. */
export function AccuracyMatrix({
  matrix,
  showRange,
  footnote,
}: {
  readonly matrix: IntentMatrix;
  readonly showRange: boolean;
  readonly footnote?: string;
}) {
  const [selection, setSelection] = useState<Selection | null>(() =>
    initialSelection(matrix)
  );
  const selectedRow = matrix.rows.find((r) => r.def.key === selection?.intent);
  const selectedCell = selectedRow?.cells.find(
    (c) => c.datasetId === selection?.datasetId
  );
  const unmapped = matrix.rows.filter((r) => r.unmapped > 0);

  return (
    <Box>
      {selectedRow && selectedCell ? (
        <CellDetail
          row={selectedRow}
          cell={selectedCell}
          datasetLabel={
            selectedCell.datasetId
              ? (LABEL_BY_ID.get(selectedCell.datasetId) ?? null)
              : null
          }
          showRange={showRange}
        />
      ) : null}

      <Box overflowX="auto" pb={1.5}>
        <Tbl
          minW="900px"
          style={{ borderCollapse: "separate", borderSpacing: "2px" }}
        >
          <THead>
            <Tr>
              <Th scope="col" aria-label="Prompt intent" />
              {DATASET_COLUMNS.map((column) => (
                <Th
                  scope="col"
                  key={column.datasetId}
                  fontSize="2xs"
                  fontWeight="semibold"
                  color="fg.muted"
                  lineHeight="1.25"
                  verticalAlign="bottom"
                  px={1}
                  pb={2}
                  maxW="74px"
                  textAlign="center"
                >
                  {column.label}
                </Th>
              ))}
            </Tr>
          </THead>
          <TBody>
            {matrix.rows.map((row) => (
              <Tr key={row.def.key}>
                <Th
                  scope="row"
                  textAlign="end"
                  pr={3}
                  whiteSpace="nowrap"
                  fontSize="xs"
                  fontWeight="semibold"
                  color="fg.muted"
                >
                  {row.def.label}
                  <Text
                    as="small"
                    display="block"
                    fontWeight="normal"
                    fontSize="2xs"
                    color="fg.subtle"
                  >
                    {row.def.crossCutting
                      ? "cross-cutting · any dataset"
                      : row.def.blurb}
                  </Text>
                </Th>
                {row.cells.map((cell) => (
                  <MatrixCell
                    key={cellKey(row, cell)}
                    row={row}
                    cell={cell}
                    selected={
                      selection?.intent === row.def.key &&
                      selection.datasetId === cell.datasetId
                    }
                    onSelect={() =>
                      setSelection({
                        intent: row.def.key,
                        datasetId: cell.datasetId,
                      })
                    }
                  />
                ))}
              </Tr>
            ))}
          </TBody>
        </Tbl>
      </Box>

      <Flex
        gap={5}
        wrap="wrap"
        align="center"
        mt={3}
        fontSize="xs"
        color="fg.muted"
      >
        <Flex align="center" gap={1.5}>
          <Flex gap="2px">
            {([1, 2, 3, 4, 5] as const).map((band) => (
              <Box
                key={band}
                w="13px"
                h="14px"
                bg={PERF_BG[band]}
                borderRadius="sm"
              />
            ))}
          </Flex>
          {MATRIX_SECTION.legendPerf}
        </Flex>
        <Flex align="center" gap={1.5}>
          <Box
            w="14px"
            h="14px"
            borderRadius="sm"
            bg={PERF_BG[4]}
            opacity={THIN_OPACITY}
          />
          {MATRIX_SECTION.legendThin}
        </Flex>
        <Flex align="center" gap={1.5}>
          <Box
            w="14px"
            h="14px"
            borderRadius="sm"
            bgImage={HATCH}
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="border"
          />
          {MATRIX_SECTION.legendNone}
        </Flex>
      </Flex>
      <Text fontSize="xs" color="fg.subtle" mt={3} maxW="78ch">
        Each cell carries performance and coverage.{" "}
        {unmapped.length
          ? `${unmapped.map((r) => `${r.unmapped} ${r.def.label.toLowerCase()}`).join(", ")} cases could not be placed on a dataset column. `
          : ""}
        {footnote}
      </Text>
    </Box>
  );
}
