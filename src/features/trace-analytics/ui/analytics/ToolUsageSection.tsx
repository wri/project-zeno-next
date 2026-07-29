"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import { computeToolUsage } from "../../lib/analytics/aggregations";
import { formatCount, formatPercent } from "../../lib/format";
import { ChartCard } from "../charts/ChartCard";
import { ToolCallsScatterChart } from "../charts/ToolCallsScatterChart";
import { StatCards } from "../primitives/StatCards";
import { tabHref } from "../links";

interface ToolUsageSectionProps {
  readonly rows: readonly TraceRow[];
}

export function ToolUsageSection({ rows }: ToolUsageSectionProps) {
  const router = useRouter();
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
              hint: "Mean over all turns, incl. 0-tool answers",
            },
            {
              label: "Max tool calls",
              value: formatCount(usage.maxToolCalls),
              hint: "Heaviest single turn in the window",
            },
            {
              label: "Tool error rate",
              value: formatPercent(usage.toolErrorRate),
              hint: "Turns with ≥1 internal tool error",
            },
          ]}
          columns={3}
        />
        {usage.scatter.length ? (
          <ChartCard
            title="Tool calls vs latency"
            help="Each dot is one trace: how many tools it called and how long it took. Click a dot to open that trace."
            info="Latency should rise roughly linearly with tool calls — that diagonal
              band is normal. Watch for red dots at low tool counts (fast failures,
              often refusals or crashes) and green dots far above the band (slow
              successes worth optimising). Dots at zero tool calls are answers that
              never touched a tool. Click any dot to open that exact trace in the
              Trace Explorer."
          >
            <ToolCallsScatterChart
              data={usage.scatter}
              onPointClick={(traceId) =>
                router.push(tabHref("traces", { trace: traceId }))
              }
            />
          </ChartCard>
        ) : null}
      </Flex>
    </Box>
  );
}
