"use client";

import { useMemo } from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import { computeToolUsage } from "../../lib/analytics/aggregations";
import { formatCount, formatPercent } from "../../lib/format";
import { ChartCard } from "../charts/ChartCard";
import { ToolCallsScatterChart } from "../charts/ToolCallsScatterChart";
import { StatCards } from "../primitives/StatCards";

interface ToolUsageSectionProps {
  readonly rows: readonly TraceRow[];
}

export function ToolUsageSection({ rows }: ToolUsageSectionProps) {
  const usage = useMemo(() => computeToolUsage(rows), [rows]);

  return (
    <Box>
      <Heading as="h3" size="md" mb={1}>
        Tool usage
      </Heading>
      <Text fontSize="sm" color="fg.muted" mb={3}>
        Per-turn tool metrics from the Zeno API. Deep agentic-flow analysis
        needs the full conversation tree and lives in Langfuse-backed tooling;
        reasoning-token charts are omitted (Gemini reports no reasoning tokens).
      </Text>
      <Flex direction="column" gap={4}>
        <StatCards
          items={[
            {
              label: "Avg tool calls / trace",
              value: usage.avgToolCalls.toFixed(2),
            },
            { label: "Max tool calls", value: formatCount(usage.maxToolCalls) },
            {
              label: "Tool error rate",
              value: formatPercent(usage.toolErrorRate),
            },
          ]}
          columns={3}
        />
        {usage.scatter.length ? (
          <ChartCard
            title="Tool calls vs latency"
            help="Each dot is one trace: how many tools it called and how long it took."
            info="Latency should rise roughly linearly with tool calls — that diagonal
              band is normal. Watch for red dots at low tool counts (fast failures,
              often refusals or crashes) and green dots far above the band (slow
              successes worth optimising). Dots at zero tool calls are answers that
              never touched a tool."
          >
            <ToolCallsScatterChart data={usage.scatter} />
          </ChartCard>
        ) : null}
      </Flex>
    </Box>
  );
}
