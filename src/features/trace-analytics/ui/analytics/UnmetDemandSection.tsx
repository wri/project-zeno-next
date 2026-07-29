"use client";

/**
 * Unmet demand: the asks the agent didn't serve, grouped so repeated requests
 * read as feature gaps, plus friction shares (unserved / defer / retry rate).
 * Each row links into the Trace Explorer pre-filtered on that prompt.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Box, Flex, Table, Text } from "@chakra-ui/react";
import { ChartCard } from "../charts/ChartCard";
import { OUTCOME_COLORS, OUTCOME_LABELS } from "../charts/palette";
import { StatCards } from "../primitives/StatCards";
import { tabHref } from "../links";
import { computeUnmetDemand } from "../../lib/analytics/unmetDemand";
import { formatCount, formatPercent, snippet } from "../../lib/format";
import type { TraceRow } from "../../model/types";

interface UnmetDemandSectionProps {
  readonly rows: readonly TraceRow[];
}

export function UnmetDemandSection({ rows }: UnmetDemandSectionProps) {
  const demand = useMemo(() => computeUnmetDemand(rows), [rows]);

  return (
    <Flex direction="column" gap={4}>
      <StatCards
        items={[
          {
            label: "Unserved turns",
            value: formatPercent(demand.unservedShare),
            hint: "Turns whose outcome was not ANSWER",
          },
          {
            label: "Deferred (declined)",
            value: formatPercent(demand.deferShare),
            hint: "Agent said it can't do this",
          },
          {
            label: "Retry rate",
            value: formatPercent(demand.retryShare),
            hint: "Same prompt repeated back-to-back in a thread",
          },
          {
            label: "Distinct unmet asks",
            value: formatCount(demand.distinctCount),
            hint:
              demand.distinctCount > demand.topPrompts.length
                ? `Unique unserved prompts (top ${demand.topPrompts.length} below)`
                : "Unique unserved prompts",
          },
        ]}
      />

      <ChartCard
        title="Top unserved asks"
        help="Prompts that most often ended without an answer — repeated asks are candidate feature gaps."
        info={
          <>
            Unserved turns (outcome ≠ ANSWER) grouped by normalized prompt text,
            so only near-exact repeats group together — paraphrases of the same
            ask appear as separate rows, which <em>understates</em>
            true demand. High user counts matter more than high turn counts:
            five different people asking beats one person retrying. Click
            “Traces” to inspect the underlying conversations.
          </>
        }
      >
        {demand.topPrompts.length === 0 ? (
          <Text fontSize="sm" color="fg.subtle" py={4}>
            Nothing unserved in this window — every turn ended in an answer.
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm" striped>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    Prompt
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="fg.subtle"
                    fontWeight="normal"
                    textAlign="right"
                  >
                    Turns
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    color="fg.subtle"
                    fontWeight="normal"
                    textAlign="right"
                  >
                    Users
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    Top outcome
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    Open
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {demand.topPrompts.map((item) => (
                  <Table.Row key={item.normalized}>
                    <Table.Cell maxW="480px">
                      <Text fontSize="sm" lineClamp={2} title={item.prompt}>
                        {snippet(item.prompt, 160)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell
                      textAlign="right"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatCount(item.count)}
                    </Table.Cell>
                    <Table.Cell
                      textAlign="right"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatCount(item.userCount)}
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">
                      <Flex align="center" gap={1.5}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="2px"
                          flexShrink={0}
                          bg={
                            OUTCOME_COLORS[
                              OUTCOME_LABELS[item.topOutcome] ?? item.topOutcome
                            ] ?? "border"
                          }
                        />
                        <Text fontSize="xs">
                          {OUTCOME_LABELS[item.topOutcome] ?? item.topOutcome}
                        </Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">
                      <Link href={tabHref("traces", { prompt: item.prompt })}>
                        <Text fontSize="sm" color="fg.link">
                          Traces
                        </Text>
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </ChartCard>
    </Flex>
  );
}
