import { Box, Grid, Text } from "@chakra-ui/react";
import { STAGE_COPY, STAGE_LABELS } from "../../model/config";
import type { BenchmarkPage, GroupStats } from "../../model/types";
import { failureBreakdown, type FailureMode } from "../../lib/failures";
import { pct, share } from "../../lib/format";
import { PASS_COLOR, STAGE_COLORS } from "../palette";
import { Panel, Section } from "../parts";

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
/** Room right of the flow for the leaf labels. */
const LABEL_BUDGET = 300;

interface Band {
  readonly mode: FailureMode;
  readonly px: number;
  readonly sy: number;
  readonly sh: number;
  /** Top and height of the band's leaf on the right. */
  readonly ly: number;
  readonly lh: number;
}

function leafPhrase(mode: FailureMode): string {
  return mode.key === "unattributed"
    ? mode.label
    : `Failed at ${mode.label.toLowerCase()}`;
}

/** Geometry of the flow: the trunk segments between stages, and the band
 * each failure leaf peels off at. Leaves stack below the trunk, the last
 * stage on top, each as tall as its band so a large leaf never overlaps
 * the next. */
function layoutFlow(modes: readonly FailureMode[], total: number) {
  const scale = total ? BODY / total : 0;
  const gap = Math.min(
    MAX_STAGE_GAP,
    (W - FIRST - LABEL_BUDGET) / Math.max(modes.length, 1)
  );
  let remaining = total;
  let segStart = X0;
  const trunk: { x: number; w: number; h: number }[] = [];
  const peels = modes.map((mode, i) => {
    const px = FIRST + i * gap;
    trunk.push({ x: segStart, w: px - segStart, h: remaining * scale });
    const peel = {
      mode,
      px,
      sy: TOP + (remaining - mode.count) * scale,
      sh: mode.count * scale,
    };
    remaining -= mode.count;
    segStart = px;
    return peel;
  });
  const passX = FIRST + modes.length * gap;
  trunk.push({ x: segStart, w: passX - segStart, h: remaining * scale });
  let ly = TOP + BODY + LEAF_GAP;
  const bands: Band[] = [...peels].reverse().map((p) => {
    const lh = Math.max(p.sh, LEAF_MIN);
    const band = { ...p, ly, lh };
    ly += lh + LEAF_SPACING;
    return band;
  });
  return { trunk, bands, passX, accurateHeight: remaining * scale, bottom: ly };
}

/** Each scored question flows left to right; a failed one peels off at the
 * stage where it first went wrong. */
function FlowChart({ stats }: { readonly stats: GroupStats }) {
  const modes = failureBreakdown(stats);
  const total = stats.scored;
  const { trunk, bands, passX, accurateHeight, bottom } = layoutFlow(
    modes,
    total
  );
  const height = bottom + 6;
  const accurate = `${stats.passed} · ${pct(share(stats.passed, total))}`;

  return (
    <Box overflowX="auto">
      <Box minW="640px">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          width="100%"
          style={{
            height: "auto",
            display: "block",
            fontFamily: "var(--chakra-fonts-body)",
          }}
          role="img"
          aria-label={`Flow of ${total} scored questions: ${modes
            .map((m) => `${leafPhrase(m)}: ${m.count}`)
            .join(", ")}; accurate on at least 2 of 3 tries: ${stats.passed}.`}
        >
          <text
            x={X0}
            y={TOP - 10}
            fontSize="12.5"
            fontWeight="600"
            fill="var(--chakra-colors-fg)"
          >
            Questions scored · {total}
          </text>
          {trunk.map((seg) => (
            <rect
              key={seg.x}
              x={seg.x}
              y={TOP}
              width={seg.w}
              height={seg.h}
              fill={PASS_COLOR}
              opacity={0.24}
            />
          ))}
          {bands.map(({ mode, px, sy, sh, ly, lh }) => {
            const cx = (px + passX) / 2;
            const color = STAGE_COLORS[mode.key];
            return (
              <g key={mode.key}>
                <text
                  x={px}
                  y={TOP + BODY + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--chakra-colors-fg-muted)"
                >
                  {mode.label}
                </text>
                <line
                  x1={px}
                  x2={px}
                  y1={TOP - 4}
                  y2={TOP + BODY + 4}
                  stroke="var(--chakra-colors-border)"
                />
                <path
                  d={`M${px} ${sy} C${cx} ${sy},${cx} ${ly},${passX} ${ly} L${passX} ${ly + lh} C${cx} ${ly + lh},${cx} ${sy + sh},${px} ${sy + sh} Z`}
                  fill={color}
                  opacity={0.38}
                >
                  <title>{`${mode.label}: ${mode.count} questions failed here first.`}</title>
                </path>
                <rect
                  x={passX}
                  y={ly}
                  width={LEAF_W}
                  height={lh}
                  rx={2}
                  fill={color}
                />
                <text
                  x={passX + LEAF_W + 10}
                  y={ly + lh / 2 + 4}
                  fontSize="12.5"
                  fill="var(--chakra-colors-fg)"
                >
                  {leafPhrase(mode)}{" "}
                  <tspan fontWeight="600">
                    {mode.count} · {pct(mode.share)}
                  </tspan>
                </text>
              </g>
            );
          })}
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
            Accurate on 2+ of 3 tries <tspan fontWeight="600">{accurate}</tspan>
          </text>
        </svg>
      </Box>
    </Box>
  );
}

export function FailureFlowSection({ page }: { readonly page: BenchmarkPage }) {
  const { summary } = page;
  const everyCount = Math.round((summary.everyTime ?? 0) * summary.scored);
  return (
    <Section
      id="fail"
      eyebrow="Where answers fail"
      title="Where do wrong answers go wrong?"
      sub="Horizon answers in five steps. Each wrong answer is counted once, at the step where it first went wrong."
    >
      <Panel>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          <b>This chart uses a looser count than the headline.</b> It counts a
          question as accurate if it was right on at least 2 of 3 tries, so it
          shows {summary.passed} ({pct(summary.majority)}) accurate questions.
          Reliable AI accuracy counts only questions right on all 3 tries:{" "}
          {everyCount} ({pct(summary.everyTime, 1)}). We&rsquo;ll update this
          chart to match for the November baseline.
        </Text>
        <Text fontWeight="semibold" mb={2}>
          Where the {summary.scored} scored questions end up
        </Text>
        <FlowChart stats={summary} />
      </Panel>
      <Grid
        mt={4}
        gap={3}
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        }}
      >
        {page.stages.map((s, i) => (
          <Panel
            key={s.key}
            borderTopWidth="3px"
            borderTopColor={STAGE_COLORS[s.key]}
            borderRadius="md"
            p={3}
            display="flex"
            flexDirection="column"
            gap={1}
            fontSize="sm"
          >
            <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
              Check {i + 1}
            </Text>
            <Text fontWeight="semibold">{STAGE_LABELS[s.key]}</Text>
            <Text color="fg.muted" fontSize="xs" flex="1">
              {STAGE_COPY[s.key].question}
            </Text>
            <Text display="flex" justifyContent="space-between" fontSize="xs">
              <span>Applies to</span>
              <b>
                {s.checked} of {summary.scored}
              </b>
            </Text>
            <Text display="flex" justifyContent="space-between" fontSize="xs">
              <span>Failed here first</span>
              <b>{s.firstFailures}</b>
            </Text>
          </Panel>
        ))}
      </Grid>
    </Section>
  );
}
