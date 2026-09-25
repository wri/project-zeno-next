"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import type { Survival } from "../../lib/survival";
import { SERIF_STACK } from "../charts/palette";
import { DIMENSION_COPY, FUNNEL_TITLE, funnelCaption } from "./copy";
import { Segments } from "./Section";

const W = 1000;
const TOP = 24;
const BASE = 160;

function stageLabel(stage: Survival["steps"][number]["stage"]): string {
  return stage === "unattributed"
    ? "Shared checks"
    : DIMENSION_COPY[stage].label;
}

/**
 * The compound effect as a survival step chart, per 100 questions: each
 * stage drops the failures first attributed to it; what reaches the end is
 * the pass count.
 */
export function SurvivalFunnel({
  survival,
  headline,
}: {
  readonly survival: Survival;
  readonly headline: number;
}) {
  if (survival.start === 0) return null;
  const per100 = (count: number) => (count / survival.start) * 100;
  const y = (value: number) => TOP + ((100 - value) / 100) * (BASE - TOP) * 1.6;
  const lead = 50;
  const stepW = (W - lead) / survival.steps.length;
  const values = survival.steps.map((step) => per100(step.survivors));

  let d = `M0,${y(100)} H${lead}`;
  values.forEach((value, index) => {
    d += ` V${Math.min(BASE, y(value))} H${lead + stepW * (index + 1)}`;
  });
  const final = values.at(-1) ?? 100;
  const summary = survival.steps
    .map(
      (step, i) => `${Math.round(values[i])} after ${stageLabel(step.stage)}`
    )
    .join(", ");

  return (
    <Box mt={7}>
      <Flex justify="space-between" align="baseline" gap={2} wrap="wrap" mb={2}>
        <Text fontSize="sm" fontWeight="bold">
          {FUNNEL_TITLE}
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color="fg.subtle">
          {survival.start} measured questions ·{" "}
          {survival.population === "full-pipeline"
            ? "all five checks exercised"
            : "all measured questions"}
        </Text>
      </Flex>
      <Box overflowX="auto">
        <Box minW="620px">
          <svg
            viewBox={`0 0 ${W} 200`}
            width="100%"
            role="img"
            aria-label={`Survival funnel: of 100 questions, ${summary}.`}
          >
            <path
              d={`${d} V${BASE} H0 Z`}
              fill="var(--chakra-colors-primary-solid)"
              fillOpacity={0.14}
            />
            <path
              d={d}
              fill="none"
              stroke="var(--chakra-colors-primary-solid)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <line
              x1={0}
              y1={BASE}
              x2={W}
              y2={BASE}
              stroke="var(--chakra-colors-fg-subtle)"
            />
            <text
              x={8}
              y={18}
              fontFamily="var(--chakra-fonts-mono)"
              fontSize={10}
              fill="var(--chakra-colors-fg-subtle)"
            >
              100 IN
            </text>
            {survival.steps.map((step, index) => {
              const cx = lead + stepW * index + stepW / 2;
              const isLast = index === survival.steps.length - 1;
              return (
                <g key={step.stage}>
                  <text
                    x={cx}
                    y={Math.min(BASE, y(values[index])) - 8}
                    textAnchor="middle"
                    fontFamily={
                      isLast ? SERIF_STACK : "var(--chakra-fonts-body)"
                    }
                    fontSize={isLast ? 26 : 15}
                    fontWeight={600}
                    fill="var(--chakra-colors-fg)"
                    paintOrder="stroke"
                    stroke="var(--chakra-colors-bg)"
                    strokeWidth={4}
                  >
                    {isLast ? "≈" : ""}
                    {Math.round(values[index])}
                  </text>
                  <text
                    x={cx}
                    y={178}
                    textAnchor="middle"
                    fontFamily="var(--chakra-fonts-mono)"
                    fontSize={10}
                    fontWeight={600}
                    letterSpacing="0.08em"
                    fill="var(--chakra-colors-fg-subtle)"
                  >
                    {stageLabel(step.stage).toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>
      </Box>
      <Text fontSize="xs" color="fg.subtle" mt={2} maxW="74ch">
        <Segments
          segments={funnelCaption({
            survivorsPer100: final,
            population: survival.population,
            headline,
          })}
        />
      </Text>
    </Box>
  );
}
