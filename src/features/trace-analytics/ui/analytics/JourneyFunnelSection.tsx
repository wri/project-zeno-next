"use client";

/**
 * Session-level journey funnel: where conversations stall on the way from a
 * question to a delivered insight. The strongest single view for spotting
 * product gaps in the AOI → dataset → insight pipeline.
 */

import { useMemo } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { ChartCard } from "../charts/ChartCard";
import { computeJourneyFunnel } from "../../lib/analytics/funnel";
import { formatCount, formatPercent } from "../../lib/format";
import type { TraceRow } from "../../model/types";

interface JourneyFunnelSectionProps {
  readonly rows: readonly TraceRow[];
}

export function JourneyFunnelSection({ rows }: JourneyFunnelSectionProps) {
  const funnel = useMemo(() => computeJourneyFunnel(rows), [rows]);

  return (
    <ChartCard
      title="Conversation journey funnel"
      help="Of all conversations in the window, how many selected an area, analysed a dataset, and got an insight."
      info={
        <>
          Stages are cumulative at the <em>conversation</em> level: a thread
          counts in a stage only if it passed every earlier one (any turn can
          satisfy a stage). Big drops mark where users stall — a low
          area-selection rate points at AOI understanding, a low
          dataset-conversion at data discovery, a low insight-conversion at
          analysis completion.
          {!funnel.insightKnown ? (
            <>
              {" "}
              The insight stage is unavailable for this window — these traces
              predate the <code>has_insight</code> flag.
            </>
          ) : null}
        </>
      }
    >
      <Flex direction="column" gap={3} py={2}>
        {funnel.stages.map((stage, i) => {
          const unavailable = stage.key === "insight" && !funnel.insightKnown;
          return (
            <Box key={stage.key}>
              <Flex justify="space-between" fontSize="xs" mb={1}>
                <Text color="fg.muted" fontWeight="medium">
                  {stage.label}
                </Text>
                <Text
                  color="fg.subtle"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {unavailable
                    ? "not reported"
                    : `${formatCount(stage.count)} · ${formatPercent(stage.shareOfTotal)} of conversations${
                        i > 0
                          ? ` · ${formatPercent(stage.conversionFromPrev)} from previous`
                          : ""
                      }`}
                </Text>
              </Flex>
              <Box bg="bg.subtle" borderRadius="sm" h="18px" overflow="hidden">
                <Box
                  bg={unavailable ? "border" : "primary.solid"}
                  opacity={unavailable ? 0.4 : 0.85 - i * 0.12}
                  h="100%"
                  borderRadius="sm"
                  width={`${Math.max(stage.shareOfTotal * 100, stage.count > 0 ? 1.5 : 0)}%`}
                  transition="width 0.3s ease"
                />
              </Box>
            </Box>
          );
        })}
        {funnel.totalSessions === 0 ? (
          <Text fontSize="xs" color="fg.subtle">
            No conversations in the selected window.
          </Text>
        ) : null}
      </Flex>
    </ChartCard>
  );
}
