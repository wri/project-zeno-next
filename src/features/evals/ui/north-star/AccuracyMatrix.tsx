"use client";

import { useState } from "react";
import { Box, chakra, Flex, Switch, Text } from "@chakra-ui/react";
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

/** The cells a row shows: per dataset, or its pooled total. */
function cellsFor(row: IntentRow, byDataset: boolean): IntentCell[] {
  return byDataset ? row.cells : [row.total];
}

/** Subject for the cell read: the dataset, "any dataset" for a pooled
 * dataset-bound row, nothing for cross-cutting intents. */
function datasetLabelFor(row: IntentRow, cell: IntentCell): string | null {
  if (cell.datasetId) return LABEL_BY_ID.get(cell.datasetId) ?? null;
  return row.def.crossCutting ? null : MATRIX_SECTION.anyDataset;
}

/** Best-measured cell of the current view: the wireframe opens on it. */
function initialSelection(
  matrix: IntentMatrix,
  byDataset: boolean
): Selection | null {
  let best: { sel: Selection; score: number } | null = null;
  for (const row of matrix.rows) {
    for (const cell of cellsFor(row, byDataset)) {
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

function cellText(row: IntentRow, cell: IntentCell, spanning: boolean): string {
  if (!spanning) {
    if (cell.coverage === "none") return "·";
    return cell.rate === null ? "—" : String(Math.round(cell.rate * 100));
  }
  if (row.def.crossCutting) {
    if (cell.coverage === "none") return `· ${row.def.blurb} · evals planned`;
    if (cell.rate === null) return `— · ${cell.cases} evals, none scored yet`;
    return `${Math.round(cell.rate * 100)} · ${row.def.blurb}, measured across all datasets`;
  }
  if (cell.coverage === "none") return "· no evals yet";
  const across = `across ${row.datasetsCovered} ${row.datasetsCovered === 1 ? "dataset" : "datasets"} · ${cell.cases} evals`;
  if (cell.rate === null) return `— · ${across}, none scored yet`;
  return `${Math.round(cell.rate * 100)} · ${across}`;
}

function MatrixCell({
  row,
  cell,
  colSpan,
  selected,
  onSelect,
}: {
  readonly row: IntentRow;
  readonly cell: IntentCell;
  /** Columns the cell spans; > 1 renders the wide, left-aligned form. */
  readonly colSpan: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const spanning = colSpan > 1 || cell.datasetId === null;
  const band = cell.rate === null ? null : perfBand(cell.rate);
  const none = cell.coverage === "none";
  const label = describeCell({
    intent: row.def,
    datasetLabel: datasetLabelFor(row, cell),
    cell,
  })
    .map((s) => s.text)
    .join("");
  return (
    <Td
      colSpan={colSpan > 1 ? colSpan : undefined}
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
      w={spanning ? "auto" : "66px"}
      minW={spanning ? undefined : "56px"}
      h="44px"
      px={spanning ? 3 : 1}
      borderRadius="md"
      textAlign={spanning ? "start" : "center"}
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
      {cellText(row, cell, spanning)}
    </Td>
  );
}

/**
 * Layer 3: what people ask, about which data. Collapsed by default to one
 * pooled figure per intent (the Report's headline read); "Show by dataset"
 * expands it into the intent x dataset heatmap.
 */
export function AccuracyMatrix({
  matrix,
  showRange,
  byDataset,
  onByDatasetChange,
  showWeightingNote,
  footnote,
}: {
  readonly matrix: IntentMatrix;
  readonly showRange: boolean;
  readonly byDataset: boolean;
  readonly onByDatasetChange: (byDataset: boolean) => void;
  /** Explain pooling weights (CHALLENGE is not evenly sampled). */
  readonly showWeightingNote: boolean;
  readonly footnote?: string;
}) {
  // One selection per view, so toggling never lands on a missing cell.
  const [pooledSel, setPooledSel] = useState<Selection | null>(() =>
    initialSelection(matrix, false)
  );
  const [datasetSel, setDatasetSel] = useState<Selection | null>(() =>
    initialSelection(matrix, true)
  );
  const selection = byDataset ? datasetSel : pooledSel;
  const setSelection = byDataset ? setDatasetSel : setPooledSel;
  const selectedRow = matrix.rows.find((r) => r.def.key === selection?.intent);
  const selectedCell = selectedRow
    ? cellsFor(selectedRow, byDataset).find(
        (c) => c.datasetId === selection?.datasetId
      )
    : undefined;
  const unmapped = matrix.rows.filter((r) => r.unmapped > 0);

  return (
    <Box>
      <Flex justify="flex-end" mb={3}>
        <Switch.Root
          size="sm"
          checked={byDataset}
          onCheckedChange={(details) => onByDatasetChange(details.checked)}
        >
          <Switch.HiddenInput />
          <Switch.Control />
          <Switch.Label fontSize="xs">
            {MATRIX_SECTION.byDatasetToggle}
          </Switch.Label>
        </Switch.Root>
      </Flex>

      {selectedRow && selectedCell ? (
        <CellDetail
          row={selectedRow}
          cell={selectedCell}
          datasetLabel={datasetLabelFor(selectedRow, selectedCell)}
          pooledAcross={
            !byDataset && !selectedRow.def.crossCutting
              ? selectedRow.datasetsCovered
              : undefined
          }
          showRange={showRange}
        />
      ) : null}

      <Box overflowX="auto" pb={1.5}>
        <Tbl
          minW={byDataset ? "900px" : undefined}
          w={byDataset ? undefined : "full"}
          style={{ borderCollapse: "separate", borderSpacing: "2px" }}
        >
          <THead>
            <Tr>
              <Th
                scope="col"
                aria-label="Prompt intent"
                w={byDataset ? undefined : "1%"}
              />
              {!byDataset ? (
                <Th
                  scope="col"
                  fontSize="2xs"
                  fontWeight="semibold"
                  color="fg.muted"
                  textAlign="start"
                  px={3}
                  pb={2}
                >
                  {MATRIX_SECTION.pooledColumn}
                </Th>
              ) : null}
              {(byDataset ? DATASET_COLUMNS : []).map((column) => (
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
                {cellsFor(row, byDataset).map((cell) => (
                  <MatrixCell
                    key={cellKey(row, cell)}
                    row={row}
                    cell={cell}
                    colSpan={
                      byDataset && row.def.crossCutting
                        ? DATASET_COLUMNS.length
                        : 1
                    }
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
        {!byDataset && showWeightingNote
          ? `${MATRIX_SECTION.pooledWeighting} `
          : ""}
        {unmapped.length
          ? `${unmapped.map((r) => `${r.unmapped} ${r.def.label.toLowerCase()}`).join(", ")} cases could not be placed on a dataset column. `
          : ""}
        {footnote}
      </Text>
    </Box>
  );
}
