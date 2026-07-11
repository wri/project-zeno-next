"use client";

import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import type { TraceRow } from "../../model/types";
import { computeStarterPromptMix } from "../../lib/analytics/aggregations";
import {
  STARTER_PROMPTS,
  STARTER_PROMPT_LABELS,
} from "../../lib/analytics/report";
import { normalizePrompt } from "../../lib/format";
import { SEGMENT_COLORS } from "../charts/palette";
import { ChartCard } from "../charts/ChartCard";
import { DonutChart } from "../charts/DonutChart";
import { HorizontalBarChart } from "../charts/HorizontalBarChart";
import { useOpenTracesInExplorer } from "../useOpenTracesInExplorer";

interface StarterMixSectionProps {
  readonly rows: readonly TraceRow[];
}

// Same normalization the mix computation uses, so clicks select exactly the
// rows that were counted.
const STARTER_SET = new Set(STARTER_PROMPTS.map(normalizePrompt));
const NORMALIZED_BY_LABEL = new Map<string, string[]>();
for (const [prompt, label] of Object.entries(STARTER_PROMPT_LABELS)) {
  const normalized = normalizePrompt(prompt);
  NORMALIZED_BY_LABEL.set(label, [
    ...(NORMALIZED_BY_LABEL.get(label) ?? []),
    normalized,
  ]);
}

function isStarter(row: TraceRow): boolean {
  const normalized = normalizePrompt(row.prompt);
  return Boolean(normalized) && STARTER_SET.has(normalized);
}

/** Starter prompt adoption — which canned prompts drive engagement. */
export function StarterMixSection({ rows }: StarterMixSectionProps) {
  const openTraces = useOpenTracesInExplorer();
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
          help="Share of prompts matching the pre-defined starter library. Click a slice to open those traces."
          info="Starter prompts are the canned suggestions shown in the GNW UI. A
            high Starter share means users lean on the suggestions to get going; a
            high Other share means they arrive with their own questions. Track this
            after changing the starter library. Click a slice to inspect its
            traces in the Trace Explorer."
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
            onSliceClick={(label) =>
              openTraces(
                `${label} prompts`,
                rows.filter((r) => isStarter(r) === (label === "Starter"))
              )
            }
          />
        </ChartCard>
        {starterMix.breakdown.length ? (
          <ChartCard
            title="Starter prompt breakdown"
            help="Which starter prompts are used most. Click a bar to open those traces."
            info="Only prompts that matched the starter library appear here. Rarely
              used starters are candidates for replacement. Click any bar to
              inspect its traces in the Trace Explorer."
          >
            <HorizontalBarChart
              data={starterMix.breakdown.map((b) => ({
                label: b.label,
                count: b.count,
              }))}
              onBarClick={(datum) => {
                // A breakdown label may cover several library phrasings; an
                // unlabelled starter falls back to its normalized text.
                const normalizedSet = new Set(
                  NORMALIZED_BY_LABEL.get(datum.label) ?? [datum.label]
                );
                openTraces(
                  `Starter prompt = ${datum.label}`,
                  rows.filter((r) =>
                    normalizedSet.has(normalizePrompt(r.prompt))
                  )
                );
              }}
            />
          </ChartCard>
        ) : null}
      </SimpleGrid>
    </Box>
  );
}
