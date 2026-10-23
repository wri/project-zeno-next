import { Box, Grid, Text } from "@chakra-ui/react";
import { STAGE_LABELS, STAGE_QUESTIONS } from "../../model/config";
import type { BenchmarkPage } from "../../model/types";
import { failureFlow, type FlowLeaf } from "../../lib/flow";
import { pct } from "../../lib/format";
import { PASS_COLOR, STAGE_COLORS } from "../palette";
import { Section } from "../parts";

const W = 1080;
const X0 = 10;
const FIRST = 200;
const TOP = 30;
const BODY = 150;
const LEAF_GAP = 26;
const LEAF_MIN = 6;
const LEAF_SPACING = 14;
const LEAF_W = 10;

interface Band {
  readonly leaf: FlowLeaf;
  readonly px: number;
  readonly sy: number;
  readonly sh: number;
  /** Top and height of the band's leaf on the right. */
  readonly ly: number;
  readonly lh: number;
}

/** Geometry of the flow: the trunk segments between stages, the band each
 * failure leaf peels off at, and the height left for accurate answers.
 * Leaves stack below the trunk, the last stage on top, each as tall as its
 * band so a large leaf never overlaps the next. */
function layoutFlow(leaves: readonly FlowLeaf[], total: number, gap: number) {
  const scale = total ? BODY / total : 0;
  let remaining = total;
  let segStart = X0;
  const trunk: { x: number; w: number; h: number }[] = [];
  const peels = leaves.map((leaf, i) => {
    const px = FIRST + i * gap;
    trunk.push({ x: segStart, w: px - segStart, h: remaining * scale });
    const peel = {
      leaf,
      px,
      sy: TOP + (remaining - leaf.count) * scale,
      sh: leaf.count * scale,
    };
    remaining -= leaf.count;
    segStart = px;
    return peel;
  });
  const passX = FIRST + leaves.length * gap;
  trunk.push({ x: segStart, w: passX - segStart, h: remaining * scale });
  let ly = TOP + BODY + LEAF_GAP;
  const bands: Band[] = [...peels].reverse().map((p) => {
    const lh = Math.max(p.sh, LEAF_MIN);
    const band = { ...p, ly, lh };
    ly += lh + LEAF_SPACING;
    return band;
  });
  return { trunk, bands, passX, remaining, scale, bottom: ly };
}

/** Each scored question flows left to right; a failed one peels off at the
 * stage where it first went wrong. */
function FlowChart({ page }: { readonly page: BenchmarkPage }) {
  const flow = failureFlow(page);
  const { total, leaves } = flow;
  const gap = leaves.length > 3 ? 130 : 180;
  const {
    trunk,
    bands: peeled,
    passX,
    remaining,
    scale,
    bottom,
  } = layoutFlow(leaves, total, gap);
  const height = Math.max(bottom, TOP + BODY + LEAF_GAP) + 6;

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
          aria-label={`Flow of ${total} scored questions: ${leaves
            .map((l) => `${l.count} failed first at ${l.label.toLowerCase()}`)
            .join(", ")}; ${flow.accurate} accurate on at least 2 of 3 tries.`}
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
          {peeled.map((b) => {
            const { ly, lh } = b;
            const cx = (b.px + passX) / 2;
            const color = STAGE_COLORS[b.leaf.key];
            return (
              <g key={b.leaf.key}>
                <text
                  x={b.px}
                  y={TOP + BODY + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--chakra-colors-fg-muted)"
                >
                  {b.leaf.label}
                </text>
                <line
                  x1={b.px}
                  x2={b.px}
                  y1={TOP - 4}
                  y2={TOP + BODY + 4}
                  stroke="var(--chakra-colors-border)"
                />
                <path
                  d={`M${b.px} ${b.sy} C${cx} ${b.sy},${cx} ${ly},${passX} ${ly} L${passX} ${ly + lh} C${cx} ${ly + lh},${cx} ${b.sy + b.sh},${b.px} ${b.sy + b.sh} Z`}
                  fill={color}
                  opacity={0.38}
                >
                  <title>{`${b.leaf.label}: ${b.leaf.count} questions failed here first.`}</title>
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
                  {b.leaf.key === "unattributed"
                    ? `${b.leaf.label} `
                    : `Failed at ${b.leaf.label.toLowerCase()} `}
                  <tspan fontWeight="600">
                    {b.leaf.count} · {Math.round((b.leaf.count / total) * 100)}%
                  </tspan>
                </text>
              </g>
            );
          })}
          <rect
            x={passX}
            y={TOP}
            width={LEAF_W + 2}
            height={remaining * scale}
            rx={2}
            fill={PASS_COLOR}
          />
          <text
            x={passX + LEAF_W + 12}
            y={TOP + (remaining * scale) / 2 + 5}
            fontSize="14"
            fill="var(--chakra-colors-fg)"
          >
            Accurate on 2+ of 3 tries{" "}
            <tspan fontWeight="600">
              {remaining} · {total ? Math.round((remaining / total) * 100) : 0}%
            </tspan>
          </text>
        </svg>
      </Box>
    </Box>
  );
}

export function FailureFlowSection({ page }: { readonly page: BenchmarkPage }) {
  const { summary } = page;
  const flow = failureFlow(page);
  const everyCount = Math.round((summary.everyTime ?? 0) * summary.scored);
  return (
    <Section
      id="fail"
      eyebrow="Where answers fail"
      title="Where do wrong answers go wrong?"
      sub="Horizon answers in five steps. Each wrong answer is counted once, at the step where it first went wrong."
    >
      <Box
        borderWidth="1px"
        borderColor="border"
        borderRadius="lg"
        bg="bg.panel"
        p={{ base: 4, md: 5 }}
      >
        <Text fontSize="sm" color="fg.muted" mb={3}>
          <b>This chart uses a looser count than the headline.</b> It counts a
          question as accurate if it was right on at least 2 of 3 tries, so it
          shows {flow.accurate} (
          {pct(summary.scored ? flow.accurate / summary.scored : null)})
          accurate questions. Reliable AI accuracy counts only questions right
          on all 3 tries: {everyCount} ({pct(summary.everyTime, 1)}).
          We&rsquo;ll update this chart to match for the November baseline.
        </Text>
        <Text fontWeight="semibold" mb={2}>
          Where the {flow.total} scored questions end up
        </Text>
        <FlowChart page={page} />
      </Box>
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
          <Box
            key={s.key}
            borderWidth="1px"
            borderColor="border"
            borderTopWidth="3px"
            borderTopColor={STAGE_COLORS[s.key]}
            borderRadius="md"
            bg="bg.panel"
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
              {STAGE_QUESTIONS[s.key]}
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
          </Box>
        ))}
      </Grid>
    </Section>
  );
}
