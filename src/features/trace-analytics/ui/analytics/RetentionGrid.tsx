"use client";

import { Box, Flex, Table, Text } from "@chakra-ui/react";
import type { RetentionResult } from "../../lib/analytics/retention";
import { ChartCard } from "../charts/ChartCard";
import { SEQUENTIAL_BLUE, sequentialBlue } from "../charts/palette";
import { formatCount } from "../../lib/format";

interface RetentionGridProps {
  readonly retention: RetentionResult;
}

/**
 * Cap on retention columns: beyond ~13 weeks the grid becomes an unreadable
 * scroll on wide windows ("All time") and cohort decay past a quarter rarely
 * changes the read.
 */
const MAX_OFFSET_COLUMNS = 13;

/** Weekly cohort retention heat table. */
export function RetentionGrid({ retention }: RetentionGridProps) {
  const { cohorts, maxOffset, weeksInWindow } = retention;

  if (weeksInWindow < 2) {
    return (
      <ChartCard
        title="Weekly retention cohorts"
        help="Share of each week's new users who come back in later weeks."
      >
        <Text fontSize="sm" color="fg.muted">
          Retention needs at least two calendar weeks of data — widen the date
          range (e.g. “Last month”) to populate the cohort grid.
        </Text>
      </ChartCard>
    );
  }

  const shownOffsets = Math.min(maxOffset, MAX_OFFSET_COLUMNS - 1);
  const truncated = maxOffset > shownOffsets;
  const offsets = Array.from({ length: shownOffsets + 1 }, (_, i) => i);

  return (
    <ChartCard
      title="Weekly retention cohorts"
      help="Share of each week's new users who come back in later weeks. Darker blue = better retention."
      info={
        <>
          Each row is a cohort: the users whose first-ever trace fell in that
          calendar week. Reading <em>across</em> a row shows how that cohort
          decays — W1 is the share active one week after joining, W2 two weeks
          after, and so on (W0 is the joining week itself, always 100%). Reading{" "}
          <em>down</em> a column compares cohorts at the same age, which is the
          fair way to judge whether retention is improving. Cells near the
          bottom-right are only partially observed — the window simply
          hasn&apos;t lasted long enough yet.
        </>
      }
    >
      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader
                fontSize="2xs"
                fontFamily="mono"
                textTransform="uppercase"
                letterSpacing="0.05em"
                color="fg.subtle"
              >
                Cohort week
              </Table.ColumnHeader>
              <Table.ColumnHeader
                textAlign="right"
                fontSize="2xs"
                fontFamily="mono"
                textTransform="uppercase"
                letterSpacing="0.05em"
                color="fg.subtle"
              >
                Users
              </Table.ColumnHeader>
              {offsets.map((offset) => (
                <Table.ColumnHeader
                  key={offset}
                  textAlign="center"
                  fontSize="2xs"
                  fontFamily="mono"
                  color="fg.subtle"
                >
                  W{offset}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {cohorts.map((cohort) => (
              <Table.Row key={cohort.cohortWeek}>
                <Table.Cell fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                  {cohort.cohortWeek}
                </Table.Cell>
                <Table.Cell
                  textAlign="right"
                  fontFamily="mono"
                  fontSize="xs"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatCount(cohort.size)}
                </Table.Cell>
                {offsets.map((offset) => {
                  const cell = cohort.cells[offset];
                  if (!cell || !cell.observed) {
                    return <Table.Cell key={offset} />;
                  }
                  return (
                    <Table.Cell
                      key={offset}
                      textAlign="center"
                      fontSize="xs"
                      fontFamily="mono"
                      minW="44px"
                      style={{
                        backgroundColor: sequentialBlue(cell.rate),
                        color: cell.rate > 0.5 ? "white" : undefined,
                        fontVariantNumeric: "tabular-nums",
                      }}
                      title={`${cell.activeUsers} of ${cohort.size} users active ${offset === 0 ? "in their joining week" : `${offset} week${offset > 1 ? "s" : ""} later`}`}
                    >
                      {(cell.rate * 100).toFixed(0)}%
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <Flex align="center" gap={2} mt={3}>
        <Text fontSize="2xs" color="fg.subtle">
          0%
        </Text>
        <Box
          h="8px"
          w="120px"
          borderRadius="full"
          style={{
            background: `linear-gradient(90deg, ${SEQUENTIAL_BLUE.from}, ${SEQUENTIAL_BLUE.to})`,
          }}
        />
        <Text fontSize="2xs" color="fg.subtle">
          100% retained
        </Text>
        {truncated ? (
          <Text fontSize="2xs" color="fg.subtle" ml={2}>
            · showing the first {MAX_OFFSET_COLUMNS} weeks of each cohort
          </Text>
        ) : null}
      </Flex>
    </ChartCard>
  );
}
