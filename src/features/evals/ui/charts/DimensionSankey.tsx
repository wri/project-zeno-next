"use client";

import { Box } from "@chakra-ui/react";
import { PRIMARY_DIMENSIONS } from "../../lib/attribution";
import type { AccuracyBreakdown } from "../../lib/attribution";
import { fmtPct } from "../../lib/format";
import { DIMENSION_COLORS, PASS_COLOR } from "./palette";

const X0 = 8;
const FIRST_STAGE_X = 150;
const STAGE_SPACING = 150;
const LEAF_W = 10;
const TOP = 28;
const BODY_H = 160;
const LEAF_TOP_GAP = 24;
const LEAF_ROW_H = 26;
const MIN_NODE_H = 4;
const INK = "#13171A";
const INK_MUTED = "#656E7B";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

interface Stage {
  key: string;
  label: string;
  count: number;
  color: string;
}

/**
 * Cascade Sankey: the body is the cases still passing so far — Scored,
 * then remaining after scope, after retrieval, and so on in the
 * sequential (scope-first) attribution order — with each stage's failures
 * peeling off the bottom into its own leaf. The body ends in Pass.
 *
 * Leaves right-align into one terminal column under the Pass node, with
 * the vertical order reversed (the first stage to peel dives deepest, the
 * last lands just under the body): bands fan without crossing, and every
 * label sits to the right of the column where no band can collide with it.
 */
export function DimensionSankey({
  breakdown,
}: {
  readonly breakdown: AccuracyBreakdown;
}) {
  const measured =
    breakdown.pass +
    PRIMARY_DIMENSIONS.reduce(
      (sum, dimension) => sum + breakdown.byDimension[dimension],
      0
    );
  if (measured === 0) return null;

  const stages: Stage[] = PRIMARY_DIMENSIONS.flatMap((dimension) => {
    const count = breakdown.byDimension[dimension];
    if (count === 0) return [];
    return [
      {
        key: dimension,
        label: `${dimension[0].toUpperCase()}${dimension.slice(1)}${
          dimension === "unattributed" ? "" : " error"
        }`,
        count,
        color: DIMENSION_COLORS[dimension],
      },
    ];
  });

  const scale = BODY_H / measured;
  const passX = FIRST_STAGE_X + stages.length * STAGE_SPACING;
  const width = passX + 250;
  const height =
    TOP + BODY_H + LEAF_TOP_GAP + Math.max(stages.length, 1) * LEAF_ROW_H;

  // Walk the cascade: body segments between peel points, one leaf per stage.
  let remaining = measured;
  let segmentStart = X0;
  const segments: { x0: number; x1: number; h: number }[] = [];
  const leaves: {
    stage: Stage;
    peelX: number;
    sy: number;
    sh: number;
    leafY: number;
    leafH: number;
  }[] = [];
  stages.forEach((stage, index) => {
    const peelX = FIRST_STAGE_X + index * STAGE_SPACING;
    segments.push({ x0: segmentStart, x1: peelX, h: remaining * scale });
    leaves.push({
      stage,
      peelX,
      sy: TOP + (remaining - stage.count) * scale,
      sh: stage.count * scale,
      // reversed rows: first peel lands lowest, last peel just under the body
      leafY:
        TOP + BODY_H + LEAF_TOP_GAP + (stages.length - 1 - index) * LEAF_ROW_H,
      leafH: Math.max(stage.count * scale, MIN_NODE_H),
    });
    remaining -= stage.count;
    segmentStart = peelX;
  });
  segments.push({ x0: segmentStart, x1: passX, h: remaining * scale });
  // all leaves terminate in one column aligned with the Pass node
  const leafX = passX;

  return (
    <Box overflowX="auto">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: "700px" }}
        role="img"
        aria-label="Scored cases cascading past each failure dimension in sequence to pass"
      >
        <text x={X0} y={TOP - 8} fontSize="12" fill={INK_MUTED}>
          Scored · {measured}
        </text>

        {/* body: the cases still passing so far */}
        {segments.map((segment, index) => (
          <rect
            key={index}
            x={segment.x0}
            y={TOP}
            width={segment.x1 - segment.x0}
            height={Math.max(segment.h, MIN_NODE_H)}
            fill={PASS_COLOR}
            opacity={0.28}
          />
        ))}

        {/* peel bands + leaf nodes, painted before labels */}
        {leaves.map(({ stage, peelX, sy, sh, leafY, leafH }) => {
          const cx = (peelX + leafX) / 2;
          return (
            <g key={stage.key}>
              <path
                d={`M ${peelX} ${sy}
                    C ${cx} ${sy}, ${cx} ${leafY}, ${leafX} ${leafY}
                    L ${leafX} ${leafY + leafH}
                    C ${cx} ${leafY + leafH}, ${cx} ${sy + sh}, ${peelX} ${sy + sh} Z`}
                fill={stage.color}
                opacity={0.35}
              />
              <rect
                x={leafX}
                y={leafY}
                width={LEAF_W}
                height={leafH}
                rx={2}
                fill={stage.color}
              />
            </g>
          );
        })}

        {/* pass terminal */}
        <rect
          x={passX}
          y={TOP}
          width={LEAF_W + 2}
          height={Math.max(remaining * scale, MIN_NODE_H)}
          rx={2}
          fill={PASS_COLOR}
        />
        <text
          x={passX + LEAF_W + 12}
          y={TOP + Math.max(remaining * scale, MIN_NODE_H) / 2 + 4}
          fontSize="13"
          fontWeight="600"
          fill={INK}
        >
          Pass
          <tspan
            fontWeight="400"
            fill={INK_MUTED}
            fontFamily={MONO}
            fontSize="12"
          >
            {" "}
            {remaining} · {fmtPct(remaining / measured)}
          </tspan>
        </text>

        {/* leaf labels: right of the terminal column, clear of every band */}
        {leaves.map(({ stage, leafY, leafH }) => (
          <text
            key={`${stage.key}-label`}
            x={leafX + LEAF_W + 12}
            y={leafY + leafH / 2 + 4}
            fontSize="12"
            fill={INK}
          >
            {stage.label}
            <tspan fill={INK_MUTED} fontFamily={MONO} fontSize="11">
              {" "}
              {stage.count} · {fmtPct(stage.count / measured)}
            </tspan>
          </text>
        ))}
      </svg>
    </Box>
  );
}
