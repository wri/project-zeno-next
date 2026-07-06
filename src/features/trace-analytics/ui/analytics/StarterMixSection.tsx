"use client";

import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import { computeStarterPromptMix } from "../../lib/analytics/aggregations";
import {
  STARTER_PROMPTS,
  STARTER_PROMPT_LABELS,
} from "../../lib/analytics/report";
import { SEGMENT_COLORS } from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { DonutChart } from "../charts/DonutChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";

interface StarterMixSectionProps {
  readonly rows: readonly TraceRow[];
}

/** Starter prompt adoption — which canned prompts drive engagement. */
export function StarterMixSection({ rows }: StarterMixSectionProps) {
  const starterMix = useMemo(
    () => computeStarterPromptMix(rows, STARTER_PROMPTS, STARTER_PROMPT_LABELS),
    [rows]
  );

  if (starterMix.starterCount + starterMix.otherCount === 0) return null;

  return (
    <Box>
      <Heading as="h4" size="sm" mb={3}>
        Starter prompt mix
      </Heading>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
        <ChartCard
          title="Starter vs other prompts"
          help="Share of prompts matching the pre-defined starter library."
          info="Starter prompts are the canned suggestions shown in the GNW UI. A
            high Starter share means users lean on the suggestions to get going; a
            high Other share means they arrive with their own questions. Track this
            after changing the starter library."
        >
          <DonutChart
            data={[
              { label: "Starter", count: starterMix.starterCount },
              { label: "Other", count: starterMix.otherCount },
            ]}
            colors={{
              // Polarity pair: the watched state is saturated, the rest pale.
              Starter: SEGMENT_COLORS.new,
              Other: SEGMENT_COLORS.returning,
            }}
            height={200}
            centerLabel="prompts"
          />
        </ChartCard>
        {starterMix.breakdown.length ? (
          <ChartCard
            title="Starter prompt breakdown"
            help="Which starter prompts are used most."
            info="Only prompts that matched the starter library appear here. Rarely
              used starters are candidates for replacement."
          >
            <HorizontalBarChart
              data={starterMix.breakdown.map((b) => ({
                label: b.label,
                count: b.count,
              }))}
            />
          </ChartCard>
        ) : null}
      </SimpleGrid>
    </Box>
  );
}
