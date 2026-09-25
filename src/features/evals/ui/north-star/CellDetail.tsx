"use client";

import { Flex, Text } from "@chakra-ui/react";
import type { IntentCell, IntentRow } from "../../lib/intent-matrix";
import { SERIF_STACK } from "../charts/palette";
import { describeCell, DIMENSION_COPY, MATRIX_SECTION } from "./copy";
import { Panel, Segments } from "./Section";
import { fmtRange } from "./tokens";

function coverageFact(row: IntentRow, cell: IntentCell): string {
  if (cell.coverage === "none") return "none yet";
  return `${cell.coverage} · ${cell.cases} evals`;
}

function dimensionFact(row: IntentRow, cell: IntentCell): string {
  if (cell.coverage === "none") return "";
  if (cell.missing.length === 0) {
    return `Measures all ${row.def.requires.length} required ${row.def.requires.length === 1 ? "dimension" : "dimensions"}`;
  }
  return `Can't yet fail in: ${cell.missing
    .map((bucket) => DIMENSION_COPY[bucket].label.toLowerCase())
    .join(", ")}`;
}

/** The plain-language read of the selected matrix cell. */
export function CellDetail({
  row,
  cell,
  datasetLabel,
  showRange,
}: {
  readonly row: IntentRow;
  readonly cell: IntentCell;
  readonly datasetLabel: string | null;
  readonly showRange: boolean;
}) {
  const dims = dimensionFact(row, cell);
  return (
    <Panel
      px={5}
      py={4}
      mb={3.5}
      borderLeftWidth="3px"
      borderLeftColor={
        cell.coverage === "none" ? "border.emphasized" : "primary.solid"
      }
      aria-live="polite"
    >
      <Text
        fontFamily="mono"
        fontSize="2xs"
        letterSpacing="0.1em"
        textTransform="uppercase"
        color="fg.subtle"
        mb={1.5}
      >
        {MATRIX_SECTION.question}
      </Text>
      <Text
        fontFamily={SERIF_STACK}
        fontSize={{ base: "md", md: "lg" }}
        lineHeight="1.45"
        maxW="46em"
        mb={2.5}
      >
        <Segments
          segments={describeCell({ intent: row.def, datasetLabel, cell })}
        />
      </Text>
      {cell.example ? (
        <Text fontSize="sm" color="fg.muted">
          A real example from the question bank:{" "}
          <Text
            as="span"
            fontFamily={SERIF_STACK}
            fontStyle="italic"
            color="fg"
          >
            &ldquo;{cell.example}&rdquo;
          </Text>
        </Text>
      ) : (
        <Text fontSize="sm" color="fg.muted">
          Example prompts for this cell will come from real user traces as evals
          are authored.
        </Text>
      )}
      <Flex
        gap={5}
        wrap="wrap"
        mt={2.5}
        fontFamily="mono"
        fontSize="xs"
        color="fg.subtle"
      >
        <span>
          Performance{" "}
          <Text as="b" color="fg">
            {cell.rate === null
              ? "not measured"
              : `${Math.round(cell.rate * 100)}%`}
          </Text>
          {showRange && cell.rate !== null
            ? ` (likely ${fmtRange(cell.ciLow, cell.ciHigh, 0)}, n=${cell.measured})`
            : ""}
        </span>
        <span>
          Coverage{" "}
          <Text as="b" color="fg">
            {coverageFact(row, cell)}
          </Text>
        </span>
        {dims ? <span>{dims}</span> : null}
        {cell.evaluated.length ? (
          <span>
            Checks run in{" "}
            {cell.evaluated
              .map((bucket) => DIMENSION_COPY[bucket].label.toLowerCase())
              .join(", ")}
          </span>
        ) : null}
      </Flex>
    </Panel>
  );
}
