"use client";

import { Badge, Box, Grid, Link, Switch, Text } from "@chakra-ui/react";
import type { RunHeader } from "../../model/types";
import { SERIF_STACK } from "../charts/palette";
import { RunTierBadge } from "../primitives/badges";
import { AccuracyTrend } from "./AccuracyTrend";
import {
  claimSentence,
  NORTH_STAR_EXPLAIN,
  NORTH_STAR_EYEBROW,
  type ScaleLine,
} from "./copy";
import type { TrendPoint } from "./model";
import { Eyebrow } from "./Section";
import { fmtRange } from "./tokens";

/**
 * Layer 1: the single number. Score by default; the range toggle adds the
 * Wilson 95% interval here, on the check cards and in the cell detail.
 */
export function NorthStarHero({
  rate,
  ciLow,
  ciHigh,
  scale,
  headlineRun,
  trend,
  showRange,
  onShowRangeChange,
  onOpenMethodology,
}: {
  readonly rate: number;
  readonly ciLow: number;
  readonly ciHigh: number;
  readonly scale: ScaleLine;
  readonly headlineRun: RunHeader | null;
  readonly trend: readonly TrendPoint[];
  readonly showRange: boolean;
  readonly onShowRangeChange: (show: boolean) => void;
  readonly onOpenMethodology: () => void;
}) {
  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "minmax(0, 5fr) minmax(0, 7fr)" }}
      gap={{ base: 6, lg: 10 }}
      alignItems="center"
    >
      <Box>
        <Eyebrow>{NORTH_STAR_EYEBROW}</Eyebrow>
        <Text
          fontFamily={SERIF_STACK}
          fontWeight="600"
          fontSize={{ base: "6xl", md: "7xl" }}
          lineHeight="0.95"
          letterSpacing="-0.025em"
          mt={2}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {(rate * 100).toFixed(1)}
          <Text as="span" fontSize="0.42em" fontWeight="500" color="fg.muted">
            %
          </Text>
        </Text>
        {showRange ? (
          <Text fontFamily="mono" fontSize="sm" color="fg.muted" mt={1}>
            likely {fmtRange(ciLow, ciHigh)}
          </Text>
        ) : null}
        <Text
          fontFamily={SERIF_STACK}
          fontSize={{ base: "lg", md: "xl" }}
          lineHeight="1.45"
          mt={3}
          maxW="24em"
        >
          {claimSentence(rate)}
        </Text>
        <Text fontSize="sm" color="fg.muted" mt={2} maxW="38em">
          {NORTH_STAR_EXPLAIN}{" "}
          <Link
            as="button"
            color="primary.fg"
            onClick={onOpenMethodology}
            fontWeight="medium"
          >
            How we measure this →
          </Link>
        </Text>

        <Box
          mt={4}
          pt={3}
          borderTopWidth="1px"
          borderColor="border"
          fontFamily="mono"
          fontSize="xs"
          color="fg.subtle"
          lineHeight="1.9"
          maxW="42em"
        >
          <Badge
            variant="subtle"
            colorPalette="primary"
            fontFamily="mono"
            letterSpacing="0.06em"
            textTransform="uppercase"
            mr={2}
          >
            {scale.badge}
          </Badge>
          {scale.detail}
          <br />
          <Text as="span" color="fg">
            {scale.counts}
          </Text>
          <br />
          {scale.method}
          {showRange ? "" : " · likely range hidden"}
        </Box>

        <Box mt={3} display="flex" gap={3} alignItems="center" flexWrap="wrap">
          {headlineRun ? <RunTierBadge run={headlineRun} /> : null}
          <Switch.Root
            size="sm"
            checked={showRange}
            onCheckedChange={(details) => onShowRangeChange(details.checked)}
          >
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label fontSize="xs">Show likely range</Switch.Label>
          </Switch.Root>
        </Box>
      </Box>

      <AccuracyTrend points={trend} showRange={showRange} />
    </Grid>
  );
}
