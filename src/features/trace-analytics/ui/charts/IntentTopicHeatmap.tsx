"use client";

/**
 * Intent × coarse-topic heat grid with three views of the same matrix:
 *   - Volume:  prompts per cell (count or share of all pairs), GNW blue ramp
 *   - Quality: success rate vs the grid average, diverging amber ↔ blue
 *   - Impact:  failed turns per cell (absolute or in excess of the average),
 *              warm amber ramp — volume × outcome, i.e. where to focus
 *
 * Row and column order stay frozen across views so they read as layers of the
 * same object. Cells forward clicks so the host section can open the cell's
 * traces in the Trace Explorer.
 */

import { ReactNode, useState } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import type {
  IntentTopicCell,
  IntentTopicMatrix,
} from "../../lib/analytics/intentTopicMatrix";
import {
  cellExcessFailures,
  cellFailures,
  cellSuccessRate,
  MIN_RESOLVED,
} from "../../lib/analytics/intentTopicMatrix";
import { prettyLabel } from "../../lib/analytics/taxonomy";
import { formatCount, formatPercent } from "../../lib/format";
import {
  DIVERGING_QUALITY,
  divergingQuality,
  SEQUENTIAL_AMBER,
  sequentialAmber,
  SEQUENTIAL_BLUE,
  sequentialBlue,
} from "./palette";

export type IntentTopicView = "volume" | "quality" | "impact";

/** Rate deviation (± percentage points as a fraction) that saturates the diverging ramp. */
const QUALITY_ARM = 0.25;
/** Ramp position beyond which the cell label switches to white ink. */
const DEEP_INK_T = 0.55;

const VIEW_LABEL: Readonly<Record<IntentTopicView, string>> = {
  volume: "Volume",
  quality: "Quality",
  impact: "Impact",
};

const INK = "#13171A";
const INK_INVERSE = "#FFFFFF";

interface IntentTopicHeatmapProps {
  readonly matrix: IntentTopicMatrix;
  /** What a "success" means under the current outcome mode, for tooltips/legend. */
  readonly successLabel?: string;
  /** Extra controls (e.g. the section's API/Refined toggle) in the toolbar. */
  readonly actions?: ReactNode;
  readonly onCellClick?: (intent: string, topic: string) => void;
}

interface CellDisplay {
  readonly bg: string;
  readonly ink: string;
  readonly label: string;
  readonly tooltip: string;
}

function volumeCell(
  cell: IntentTopicCell,
  matrix: IntentTopicMatrix,
  share: boolean,
  name: string
): CellDisplay {
  const t = matrix.maxCount ? cell.count / matrix.maxCount : 0;
  const shareText = matrix.total
    ? formatPercent(cell.count / matrix.total, 1)
    : "0%";
  return {
    bg: sequentialBlue(t),
    ink: t > DEEP_INK_T ? INK_INVERSE : INK,
    label: cell.count ? (share ? shareText : formatCount(cell.count)) : "",
    tooltip: `${name} · ${formatCount(cell.count)} prompts · ${shareText} of all pairs`,
  };
}

function qualityCell(
  cell: IntentTopicCell,
  avg: number | null,
  name: string,
  successLabel: string
): CellDisplay {
  const rate = cellSuccessRate(cell);
  if (rate === null || avg === null) {
    return {
      bg: "#F1F2F4",
      ink: "#9AA3AE",
      label: cell.count ? "·" : "",
      tooltip: cell.count
        ? `${name} · only ${formatCount(cell.resolved)} resolved of ${formatCount(
            cell.count
          )} prompts — rate suppressed (needs ≥ ${MIN_RESOLVED})`
        : `${name} · no prompts`,
    };
  }
  const t = Math.max(-1, Math.min(1, (rate - avg) / QUALITY_ARM));
  const delta = Math.round((rate - avg) * 100);
  return {
    bg: divergingQuality(t),
    // The amber (below-average) arm stays readable with dark ink at full
    // saturation; only the blue arm gets deep enough for white.
    ink: t > DEEP_INK_T ? INK_INVERSE : INK,
    label: formatPercent(rate, 0),
    tooltip: `${name} · ${formatPercent(rate, 0)} ${successLabel} (${formatCount(
      cell.successes
    )} of ${formatCount(cell.resolved)} resolved) · ${
      delta >= 0 ? "+" : "−"
    }${Math.abs(delta)}pp vs the ${formatPercent(avg, 0)} average`,
  };
}

function impactCell(
  cell: IntentTopicCell,
  matrix: IntentTopicMatrix,
  excess: boolean,
  maxValue: number,
  name: string
): CellDisplay {
  const failures = cellFailures(cell);
  const value = excess
    ? cellExcessFailures(cell, matrix.avgSuccessRate)
    : failures;
  const t = maxValue ? value / maxValue : 0;
  const excessNote =
    matrix.avgSuccessRate === null
      ? ""
      : ` · ${formatCount(Math.round(cellExcessFailures(cell, matrix.avgSuccessRate)))} above the ${formatPercent(matrix.avgSuccessRate, 0)} average`;
  return {
    bg: sequentialAmber(t),
    ink: t > DEEP_INK_T ? INK_INVERSE : INK,
    label: value >= 0.5 ? formatCount(Math.round(value)) : "",
    tooltip: `${name} · ${formatCount(failures)} failed of ${formatCount(
      cell.resolved
    )} resolved${excessNote}`,
  };
}

export function IntentTopicHeatmap({
  matrix,
  successLabel = "attempted answers",
  actions,
  onCellClick,
}: IntentTopicHeatmapProps) {
  const [view, setView] = useState<IntentTopicView>("volume");
  const [volumeShare, setVolumeShare] = useState(false);
  const [impactExcess, setImpactExcess] = useState(false);

  const avg = matrix.avgSuccessRate;
  const maxImpact = Math.max(
    0,
    ...matrix.cells
      .flat()
      .map((cell) =>
        impactExcess ? cellExcessFailures(cell, avg) : cellFailures(cell)
      )
  );

  function display(cell: IntentTopicCell, name: string): CellDisplay {
    if (view === "quality") return qualityCell(cell, avg, name, successLabel);
    if (view === "impact") {
      return impactCell(cell, matrix, impactExcess, maxImpact, name);
    }
    return volumeCell(cell, matrix, volumeShare, name);
  }

  const legend =
    view === "quality" ? (
      <>
        <Text fontSize="2xs" color="fg.subtle">
          {avg === null
            ? "—"
            : `≤ ${formatPercent(Math.max(0, avg - QUALITY_ARM), 0)}`}
        </Text>
        <Box
          h="8px"
          w="120px"
          borderRadius="full"
          style={{
            background: `linear-gradient(90deg, ${DIVERGING_QUALITY.below}, ${DIVERGING_QUALITY.mid} 50%, ${DIVERGING_QUALITY.above})`,
          }}
        />
        <Text fontSize="2xs" color="fg.subtle">
          {avg === null
            ? "no resolved outcomes in this window"
            : `≥ ${formatPercent(Math.min(1, avg + QUALITY_ARM), 0)} · midpoint = ${formatPercent(
                avg,
                0
              )} average ${successLabel} · grey = fewer than ${MIN_RESOLVED} resolved`}
        </Text>
      </>
    ) : (
      <>
        <Text fontSize="2xs" color="fg.subtle">
          0
        </Text>
        <Box
          h="8px"
          w="120px"
          borderRadius="full"
          style={{
            background:
              view === "volume"
                ? `linear-gradient(90deg, ${SEQUENTIAL_BLUE.from}, ${SEQUENTIAL_BLUE.to})`
                : `linear-gradient(90deg, ${SEQUENTIAL_AMBER.from}, ${SEQUENTIAL_AMBER.to})`,
          }}
        />
        <Text fontSize="2xs" color="fg.subtle">
          {view === "volume"
            ? volumeShare
              ? `${matrix.total ? formatPercent(matrix.maxCount / matrix.total, 1) : "0%"} of all pairs / cell`
              : `${formatCount(matrix.maxCount)} prompts / cell`
            : `${formatCount(Math.round(maxImpact))} failed turns${
                impactExcess ? " above average" : ""
              } / cell`}
        </Text>
      </>
    );

  return (
    <Box>
      <Flex justify="space-between" align="center" gap={2} mb={2} wrap="wrap">
        <Flex gap={1}>
          {(["volume", "quality", "impact"] as const).map((v) => (
            <Button
              key={v}
              size="xs"
              variant={view === v ? "solid" : "outline"}
              onClick={() => setView(v)}
            >
              {VIEW_LABEL[v]}
            </Button>
          ))}
        </Flex>
        <Flex gap={1} align="center">
          {view === "volume" ? (
            <Flex gap={1}>
              {([false, true] as const).map((share) => (
                <Button
                  key={String(share)}
                  size="xs"
                  variant={volumeShare === share ? "solid" : "outline"}
                  onClick={() => setVolumeShare(share)}
                >
                  {share ? "% of total" : "Count"}
                </Button>
              ))}
            </Flex>
          ) : null}
          {view === "impact" ? (
            <Flex gap={1}>
              {([false, true] as const).map((excess) => (
                <Button
                  key={String(excess)}
                  size="xs"
                  variant={impactExcess === excess ? "solid" : "outline"}
                  onClick={() => setImpactExcess(excess)}
                >
                  {excess ? "Shortfall vs average" : "All failures"}
                </Button>
              ))}
            </Flex>
          ) : null}
          {actions}
        </Flex>
      </Flex>

      <Box overflowX="auto">
        <Grid
          templateColumns={`max-content repeat(${matrix.topics.length}, minmax(52px, 1fr))`}
          gap="2px"
          alignItems="stretch"
          minW="640px"
        >
          <Box />
          {matrix.topics.map((topic) => (
            <Text
              key={topic}
              fontSize="2xs"
              color="fg.subtle"
              textAlign="center"
              alignSelf="end"
              px={0.5}
              pb={1}
              lineHeight="1.25"
            >
              {topic}
            </Text>
          ))}
          {matrix.intents.map((intent, i) => (
            <Flex key={intent} display="contents">
              <Text
                fontSize="2xs"
                fontFamily="mono"
                color="fg.subtle"
                pr={2}
                textAlign="right"
                alignSelf="center"
              >
                {prettyLabel(intent)}
              </Text>
              {matrix.topics.map((topic, j) => {
                const cell = matrix.cells[i][j];
                const d = display(cell, `${prettyLabel(intent)} × ${topic}`);
                return (
                  <Flex
                    key={topic}
                    h="30px"
                    borderRadius="2px"
                    bg={d.bg}
                    align="center"
                    justify="center"
                    title={d.tooltip}
                    cursor={onCellClick && cell.count ? "pointer" : undefined}
                    onClick={
                      onCellClick && cell.count
                        ? () => onCellClick(intent, topic)
                        : undefined
                    }
                  >
                    <Text
                      fontSize="2xs"
                      fontFamily="mono"
                      style={{ color: d.ink }}
                    >
                      {d.label}
                    </Text>
                  </Flex>
                );
              })}
            </Flex>
          ))}
        </Grid>
      </Box>

      <Flex align="center" gap={2} mt={3} wrap="wrap">
        {legend}
      </Flex>
    </Box>
  );
}
