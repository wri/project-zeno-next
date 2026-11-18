import { Box, Text } from "@chakra-ui/react";
import {
  ATTRIBUTION_ORDER,
  STAGE_COPY,
  STAGE_LABELS,
} from "../../model/config";
import type { AttributionKey } from "../../model/types";
import type { FailureFlow, FlowMode } from "../../lib/failures";
import { STANDARDS, TIER_COPY, type Standard } from "../../lib/tiers";
import { pct, share } from "../../lib/format";
import { PASS_COLOR, STAGE_COLORS, tint } from "../palette";
import {
  DIMMED,
  FADE,
  MOTION_SAFE,
  TipKey,
  TipNote,
  TipRows,
  TipRule,
  TipValue,
  useChartHover,
  useTween,
} from "../chart-hover";

const W = 1080;
const X0 = 10;
const FIRST = 200;
const TOP = 30;
const BODY = 150;
const LEAF_GAP = 26;
const LEAF_W = 10;
const LEAF_MIN = 6;
const LEAF_SPACING = 14;
const MAX_STAGE_GAP = 180;
/** Decimal places for every share the chart shows. */
const PCT_DIGITS = 1;
/** Baseline of the header row above the flow: the trunk title and each
 * stage's label, which starts just right of its break line. */
const HEADER_Y = TOP - 10;
const LABEL_DX = 5;
/** Break lines reach up past the header row to meet their labels. */
const RULE_TOP = HEADER_Y - 12;
/** Room right of the flow for the leaf labels. */
const LABEL_BUDGET = 300;
/** Band opacity at rest and when its stage is hovered. */
const BAND_OPACITY = 0.38;
const BAND_ACTIVE = 0.62;
/** The highlighted route through the trunk. */
const ROUTE_OPACITY = 0.55;
/** How many question types a stage's tooltip names. */
const TOP_TYPES = 3;

type FlowKey = AttributionKey | "accurate";
type Counts = Readonly<Record<AttributionKey, number>>;

interface Band {
  readonly key: AttributionKey;
  readonly count: number;
  /** 0–1: a stage fades out as its count eases to 0. */
  readonly visible: number;
  readonly px: number;
  readonly sy: number;
  readonly sh: number;
  /** Top and height of the band's leaf on the right. */
  readonly ly: number;
  readonly lh: number;
}

function leafPhrase(key: AttributionKey): string {
  return key === "unattributed"
    ? STAGE_LABELS[key]
    : `Failed at ${STAGE_LABELS[key].toLowerCase()}`;
}

/** The stages any measure has failures at. The chart draws all of them
 * under every measure, so its break lines stay put when the measure
 * changes. */
export function flowStages(
  flows: Readonly<Record<Standard, FailureFlow>>
): AttributionKey[] {
  return ATTRIBUTION_ORDER.filter((k) =>
    STANDARDS.some((s) => flows[s].modes.some((m) => m.key === k))
  );
}

/** Geometry of the flow: the trunk segments between stages, and the band
 * each failure leaf peels off at. Leaves stack below the trunk, the last
 * stage on top, each as tall as its band so a large leaf never overlaps
 * the next. Counts may be fractional while the chart eases between
 * measures. */
function layoutFlow(
  stages: readonly AttributionKey[],
  counts: Counts,
  total: number
) {
  const scale = total ? BODY / total : 0;
  const gap = Math.min(
    MAX_STAGE_GAP,
    (W - FIRST - LABEL_BUDGET) / Math.max(stages.length, 1)
  );
  let remaining = total;
  let segStart = X0;
  const trunk: { x: number; w: number; h: number }[] = [];
  const peels = stages.map((key, i) => {
    const count = counts[key];
    const px = FIRST + i * gap;
    trunk.push({ x: segStart, w: px - segStart, h: remaining * scale });
    const peel = {
      key,
      count,
      visible: Math.min(1, count),
      px,
      sy: TOP + (remaining - count) * scale,
      sh: count * scale,
    };
    remaining -= count;
    segStart = px;
    return peel;
  });
  const passX = FIRST + stages.length * gap;
  trunk.push({ x: segStart, w: passX - segStart, h: remaining * scale });
  let ly = TOP + BODY + LEAF_GAP;
  const bands: Band[] = [...peels].reverse().map((p) => {
    const lh = Math.max(p.sh, LEAF_MIN * p.visible);
    const band = { ...p, ly, lh };
    ly += lh + LEAF_SPACING * p.visible;
    return band;
  });
  return {
    trunk,
    bands,
    gap,
    passX,
    accurate: remaining,
    accurateHeight: remaining * scale,
    bottom: ly,
  };
}

/** The chart's height under its tallest measure, so it never jumps. */
export function flowHeight(
  stages: readonly AttributionKey[],
  flows: Readonly<Record<Standard, FailureFlow>>
): number {
  return (
    Math.max(
      ...STANDARDS.map(
        (s) => layoutFlow(stages, flows[s].counts, flows[s].scored).bottom
      )
    ) + 6
  );
}

function StageTip({
  stage,
  mode,
  total,
  standard,
}: {
  readonly stage: AttributionKey;
  readonly mode: FlowMode | undefined;
  readonly total: number;
  readonly standard: Standard;
}) {
  const count = mode?.count ?? 0;
  const types = mode?.types.slice(0, TOP_TYPES) ?? [];
  return (
    <>
      <TipValue>
        {count} questions · {pct(share(count, total), PCT_DIGITS)}
      </TipValue>
      <TipKey color={STAGE_COLORS[stage]}>
        {stage === "unattributed"
          ? "Failed, with no stage attributed"
          : `Failed first at ${STAGE_LABELS[stage].toLowerCase()}`}
      </TipKey>
      {stage === "unattributed" ? null : (
        <TipNote>{STAGE_COPY[stage].question}</TipNote>
      )}
      {types.length ? (
        <>
          <TipRule />
          <Text opacity={0.72}>Mostly from</Text>
          <TipRows
            rows={types.map((t) => ({
              key: t.key,
              color: tint(STAGE_COLORS[stage], 60),
              label: t.label,
              value: t.count,
            }))}
          />
        </>
      ) : null}
      <TipNote>Measure: accurate on {TIER_COPY[standard].tries}</TipNote>
    </>
  );
}

function AccurateTip({
  flow,
  standard,
}: {
  readonly flow: FailureFlow;
  readonly standard: Standard;
}) {
  return (
    <>
      <TipValue>
        {flow.accurate} questions · {pct(flow.accurateShare, PCT_DIGITS)}
      </TipValue>
      <TipKey color={PASS_COLOR}>
        Accurate on {TIER_COPY[standard].tries}
      </TipKey>
      <TipNote>Passed every check at every step on those tries.</TipNote>
    </>
  );
}

/** Each scored question flows left to right; a failed one peels off at the
 * stage where it first went wrong. Hovering a stage lights its route from
 * the start of the trunk to its leaf; changing the measure eases the bands
 * to their new sizes. */
export function FailureFlowChart({
  flow,
  stages,
  height,
  standard,
}: {
  readonly flow: FailureFlow;
  /** The stages to draw, fixed across measures (see flowStages). */
  readonly stages: readonly AttributionKey[];
  readonly height: number;
  readonly standard: Standard;
}) {
  const total = flow.scored;
  const counts = useTween(flow.counts);
  const { trunk, bands, gap, passX, accurate, accurateHeight } = layoutFlow(
    stages,
    counts,
    total
  );
  const hover = useChartHover<FlowKey>();
  const modes = new Map(flow.modes.map((m) => [m.key, m]));
  const { tries, leaf } = TIER_COPY[standard];
  const route = (() => {
    if (hover.active === "accurate") {
      return { y: TOP, h: accurateHeight, x2: passX, color: PASS_COLOR };
    }
    const band = bands.find((b) => b.key === hover.active);
    return band
      ? { y: band.sy, h: band.sh, x2: band.px, color: STAGE_COLORS[band.key] }
      : null;
  })();
  const accurateTip = <AccurateTip flow={flow} standard={standard} />;

  return (
    <Box overflowX="auto" css={MOTION_SAFE}>
      <Box minW="640px">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          width="100%"
          style={{
            height: "auto",
            display: "block",
            fontFamily: "var(--chakra-fonts-body)",
          }}
          role="group"
          aria-label={`Flow of ${total} scored questions: ${flow.modes
            .map((m) => `${leafPhrase(m.key)}: ${m.count}`)
            .join(", ")}; accurate on ${tries}: ${flow.accurate}.`}
        >
          <text
            x={X0}
            y={HEADER_Y}
            fontSize="12.5"
            fontWeight="600"
            fill="var(--chakra-colors-fg)"
          >
            All questions scored
          </text>
          {trunk.map((seg, i) => (
            <rect
              key={i}
              x={seg.x}
              y={TOP}
              width={Math.max(0, seg.w)}
              height={seg.h}
              fill={PASS_COLOR}
              opacity={0.24}
            />
          ))}
          {route ? (
            <rect
              x={X0}
              y={route.y}
              width={route.x2 - X0}
              height={route.h}
              rx={1}
              fill={route.color}
              opacity={ROUTE_OPACITY}
              pointerEvents="none"
            />
          ) : null}
          {bands.map((b) => {
            const cx = (b.px + passX) / 2;
            const color = STAGE_COLORS[b.key];
            const on = hover.active === b.key;
            const fade = hover.dimmed(b.key) ? DIMMED : 1;
            const shown = b.visible > 0.02;
            const handlers = hover.target(
              b.key,
              <StageTip
                stage={b.key}
                mode={modes.get(b.key)}
                total={total}
                standard={standard}
              />
            );
            return (
              <g key={b.key}>
                <line
                  x1={b.px}
                  x2={b.px}
                  y1={RULE_TOP}
                  y2={TOP + BODY + 4}
                  stroke={
                    on
                      ? "var(--chakra-colors-fg)"
                      : "var(--chakra-colors-border)"
                  }
                />
                <text
                  x={b.px + LABEL_DX}
                  y={HEADER_Y}
                  fontSize="11"
                  fontWeight={on ? 600 : 400}
                  fill={
                    on
                      ? "var(--chakra-colors-fg)"
                      : "var(--chakra-colors-fg-muted)"
                  }
                >
                  {STAGE_LABELS[b.key]}
                </text>
                <rect
                  x={b.px - 4}
                  y={RULE_TOP - 4}
                  width={gap - 8}
                  height={20}
                  fill="transparent"
                  {...handlers}
                />
                <g
                  visibility={shown ? "visible" : "hidden"}
                  opacity={fade}
                  style={{ transition: FADE }}
                >
                  <path
                    d={`M${b.px} ${b.sy} C${cx} ${b.sy},${cx} ${b.ly},${passX} ${b.ly} L${passX} ${b.ly + b.lh} C${cx} ${b.ly + b.lh},${cx} ${b.sy + b.sh},${b.px} ${b.sy + b.sh} Z`}
                    fill={color}
                    opacity={on ? BAND_ACTIVE : BAND_OPACITY}
                    style={{ transition: FADE, outline: "none" }}
                    tabIndex={shown ? 0 : -1}
                    role="img"
                    aria-label={`${leafPhrase(b.key)}: ${Math.round(b.count)} questions`}
                    {...handlers}
                  />
                  <rect
                    x={passX}
                    y={b.ly}
                    width={LEAF_W}
                    height={b.lh}
                    rx={2}
                    fill={color}
                  />
                  <text
                    x={passX + LEAF_W + 10}
                    y={b.ly + b.lh / 2 + 4}
                    fontSize="12.5"
                    fill="var(--chakra-colors-fg)"
                    // A leaf easing to 0 drops its label at once, before
                    // the shrinking leaf lets it overlap the next one.
                    opacity={b.visible === 1 ? 1 : 0}
                    style={{ transition: FADE }}
                  >
                    {leafPhrase(b.key)}{" "}
                    <tspan fontWeight="600">
                      {Math.round(b.count)} ·{" "}
                      {pct(share(b.count, total), PCT_DIGITS)}
                    </tspan>
                  </text>
                  <rect
                    x={passX - 4}
                    y={b.ly - 4}
                    width={LABEL_BUDGET}
                    height={b.lh + 8}
                    fill="transparent"
                    {...handlers}
                  />
                </g>
              </g>
            );
          })}
          <g
            opacity={hover.dimmed("accurate") ? DIMMED : 1}
            style={{ transition: FADE }}
          >
            <rect
              x={passX}
              y={TOP}
              width={LEAF_W + 2}
              height={accurateHeight}
              rx={2}
              fill={PASS_COLOR}
            />
            <text
              x={passX + LEAF_W + 12}
              y={TOP + accurateHeight / 2 + 5}
              fontSize="14"
              fill="var(--chakra-colors-fg)"
            >
              Accurate on {leaf}{" "}
              <tspan fontWeight="600">
                {Math.round(accurate)} ·{" "}
                {pct(share(accurate, total), PCT_DIGITS)}
              </tspan>
            </text>
            <rect
              x={passX - 4}
              y={TOP}
              width={LABEL_BUDGET}
              height={accurateHeight}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`Accurate on ${tries}: ${flow.accurate} questions`}
              style={{ outline: "none" }}
              {...hover.target("accurate", accurateTip)}
            />
          </g>
        </svg>
      </Box>
      {hover.tooltip}
    </Box>
  );
}
