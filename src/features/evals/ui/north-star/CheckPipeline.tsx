"use client";

import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import type { CheckRate } from "../../lib/check-rates";
import { SERIF_STACK } from "../charts/palette";
import { CHECKS_SECTION, DIMENSION_COPY } from "./copy";
import { Panel } from "./Section";
import { fmtRange } from "./tokens";

function Sparkline({
  values,
  label,
}: {
  readonly values: readonly (number | null)[];
  readonly label: string;
}) {
  const known = values.flatMap((value, index) =>
    value === null ? [] : [{ value, index }]
  );
  if (known.length < 2) return null;
  const min = Math.min(...known.map((k) => k.value));
  const max = Math.max(...known.map((k) => k.value));
  const span = max - min || 1;
  const x = (index: number) => 4 + (index / (values.length - 1)) * 112;
  const y = (value: number) => 26 - ((value - min) / span) * 20;
  const last = known.at(-1)!;
  return (
    <Box mt={2.5} role="img" aria-label={label}>
      <svg
        viewBox="0 0 120 30"
        width="100%"
        height="30"
        preserveAspectRatio="none"
      >
        <polyline
          points={known.map((k) => `${x(k.index)},${y(k.value)}`).join(" ")}
          fill="none"
          stroke="var(--chakra-colors-primary-solid)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={x(last.index)}
          cy={y(last.value)}
          r={3}
          fill="var(--chakra-colors-primary-solid)"
        />
      </svg>
    </Box>
  );
}

/** Layer 2: one card per dimension, in the order an answer is made. */
export function CheckPipeline({
  checks,
  history,
  showRange,
}: {
  readonly checks: readonly CheckRate[];
  readonly history: Readonly<Record<string, readonly (number | null)[]>>;
  readonly showRange: boolean;
}) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap={2.5}>
      {checks.map((check, index) => {
        const copy = DIMENSION_COPY[check.bucket];
        const measured = check.rate !== null;
        return (
          <Panel
            key={check.bucket}
            p={4}
            display="flex"
            flexDirection="column"
            position="relative"
            opacity={measured ? 1 : 0.75}
            borderStyle={measured ? "solid" : "dashed"}
          >
            <Text
              fontFamily="mono"
              fontSize="2xs"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="fg.subtle"
            >
              Check {index + 1}
            </Text>
            <Text fontWeight="bold" mt={0.5}>
              {copy.label}
            </Text>
            <Text fontSize="xs" color="fg.muted" lineHeight="1.45" minH="4.4em">
              {copy.question}
            </Text>
            {measured ? (
              <>
                <Text
                  fontFamily={SERIF_STACK}
                  fontSize="3xl"
                  fontWeight="600"
                  lineHeight="1"
                  letterSpacing="-0.02em"
                  mt={2}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {(check.rate! * 100).toFixed(1)}%
                </Text>
                <Text fontFamily="mono" fontSize="2xs" color="fg.subtle" mt={1}>
                  {check.evaluated} checks · latest
                  {showRange
                    ? ` · ${fmtRange(check.ciLow, check.ciHigh, 0)}`
                    : ""}
                </Text>
                <Sparkline
                  values={history[check.bucket] ?? []}
                  label={`${copy.label} trend across snapshots`}
                />
              </>
            ) : (
              <Text fontSize="sm" color="fg.subtle" mt={2}>
                {CHECKS_SECTION.unmeasured}: no dedicated{" "}
                {copy.label.toLowerCase()} check ran on these questions.
              </Text>
            )}
          </Panel>
        );
      })}
    </SimpleGrid>
  );
}
