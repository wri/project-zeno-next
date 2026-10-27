import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Box } from "@chakra-ui/react";
import { formatDay, pct } from "../../lib/format";
import { monthsSinceOrigin } from "../../lib/runs";
import { PASS_COLOR, TIER_OPACITY } from "../palette";
import {
  DIMMED,
  FADE,
  MOTION_SAFE,
  TipNote,
  TipRows,
  TipRule,
  useChartHover,
} from "../chart-hover";

export interface TrendPoint {
  readonly runId: string;
  readonly started: string;
  /** Share right on every try, in [0, 1]. */
  readonly everyTime: number;
  /** Share right on at least 2 of 3 tries. */
  readonly majority: number | null;
  /** Share right on at least 1 of 3 tries. */
  readonly anyTime: number | null;
}

// Axis: Sep 2026 to Dec 2027 in months; the v2026 freeze is in November 2026.
const W = 680;
const H = 490;
const L = 46;
const R = 18;
const T = 18;
const B = 442;
/** Width of the range bar stacked above each point, at rest and hovered. */
const BAR_W = 10;
const BAR_W_ACTIVE = 14;
const DOT_R = 6.5;
const DOT_R_ACTIVE = 8;
const MONTHS = 15;
const FREEZE_MONTH = 2;
const TICKS: readonly [number, string][] = [
  [0, "Sep 26"],
  [3, "Dec"],
  [6, "Mar 27"],
  [9, "Jun"],
  [12, "Sep"],
  [15, "Dec"],
];
const Y_TICKS = [100, 80, 60, 40, 20, 0] as const;

/** The point's range bar, bottom up; a missing share ends the bar early. */
function rangeSegments(p: TrendPoint) {
  const segments: { tier: "most" | "some"; from: number; to: number }[] = [];
  if (p.majority == null) return segments;
  segments.push({ tier: "most", from: p.everyTime, to: p.majority });
  if (p.anyTime != null) {
    segments.push({ tier: "some", from: p.majority, to: p.anyTime });
  }
  return segments.filter((s) => s.to > s.from);
}

function RunTip({
  point,
  previous,
  draft,
}: {
  readonly point: TrendPoint;
  readonly previous: TrendPoint | undefined;
  readonly draft: boolean;
}) {
  const rows = [
    { key: "every", label: "Every time", value: point.everyTime },
    { key: "most", label: "At least most of the time", value: point.majority },
    { key: "some", label: "At least some of the time", value: point.anyTime },
  ] as const;
  const change = previous ? (point.everyTime - previous.everyTime) * 100 : null;
  return (
    <>
      <TipNote>
        {formatDay(point.started)}
        {draft ? " · draft run" : ""}
      </TipNote>
      <TipRows
        rows={rows
          .filter((row) => row.value != null)
          .map((row) => ({
            key: row.key,
            color: PASS_COLOR,
            opacity: TIER_OPACITY[row.key],
            label: row.label,
            value: pct(row.value, 1),
          }))}
      />
      {previous && change !== null ? (
        <>
          <TipRule />
          <TipNote>
            {change >= 0 ? "+" : "−"}
            {Math.abs(change).toFixed(1)} pts every time since{" "}
            {formatDay(previous.started)}
          </TipNote>
        </>
      ) : null}
    </>
  );
}

/**
 * Headline accuracy (right every time) per canonical run of the version.
 * Points only; a line joins them once there are two or more. The shares are
 * nested (every time ⊆ most ⊆ some), so each point carries one bar stacked
 * upwards from it, tinted like the tier bar: up to "most of the time", then
 * on to "some of the time". A crosshair snaps to the run nearest the
 * pointer (or steps through runs with the arrow keys) and one tooltip lists
 * all three shares.
 */
export function TrendChart({
  points,
  draft,
}: {
  readonly points: readonly TrendPoint[];
  /** Label the points as draft runs. */
  readonly draft: boolean;
}) {
  const x = (m: number) =>
    L + (Math.max(0, Math.min(MONTHS, m)) / MONTHS) * (W - L - R);
  const y = (v: number) => T + ((100 - v) / 100) * (B - T);
  const fx = x(FREEZE_MONTH);
  const placed = points.map((p) => ({
    ...p,
    px: x(monthsSinceOrigin(p.started)),
    py: y(p.everyTime * 100),
    segments: rangeSegments(p).map((s) => ({
      ...s,
      top: y(s.to * 100),
      bottom: y(s.from * 100),
    })),
  }));
  const last = placed[placed.length - 1];
  const svgRef = useRef<SVGSVGElement>(null);
  const hover = useChartHover<string>();
  const activeIndex = placed.findIndex((p) => p.runId === hover.active);

  function activate(i: number, at?: { x: number; y: number }) {
    const p = placed[i];
    const box = svgRef.current?.getBoundingClientRect();
    if (!p || !box) return;
    const tip = <RunTip point={p} previous={placed[i - 1]} draft={draft} />;
    hover.show(
      p.runId,
      tip,
      at?.x ?? box.left + (p.px / W) * box.width,
      at?.y ?? box.top + (p.py / H) * box.height
    );
  }

  function onPointerMove(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const vx = ((e.clientX - box.left) / box.width) * W;
    const nearest = placed.reduce(
      (best, p, i) =>
        Math.abs(p.px - vx) < Math.abs(placed[best].px - vx) ? i : best,
      0
    );
    if (nearest === activeIndex) hover.place(e.clientX, e.clientY);
    else activate(nearest, { x: e.clientX, y: e.clientY });
  }

  function onKeyDown(e: KeyboardEvent<SVGRectElement>) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const from = activeIndex < 0 ? placed.length - 1 : activeIndex;
    activate(Math.max(0, Math.min(placed.length - 1, from + step)));
  }

  return (
    <Box css={MOTION_SAFE}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          height: "auto",
          display: "block",
          fontFamily: "var(--chakra-fonts-body)",
        }}
        role="group"
        aria-label={
          points.length
            ? `Accuracy over time: ${points
                .map((p) => `${pct(p.everyTime, 1)} on ${formatDay(p.started)}`)
                .join(", ")}.`
            : "Accuracy over time: no comparable runs yet."
        }
      >
        {Y_TICKS.map((v) => (
          <g key={v}>
            <line
              x1={L}
              x2={W - R}
              y1={y(v)}
              y2={y(v)}
              stroke={
                v === 0
                  ? "var(--chakra-colors-fg-subtle)"
                  : "var(--chakra-colors-border-muted)"
              }
              strokeWidth={1}
            />
            <text
              x={L - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--chakra-colors-fg-subtle)"
            >
              {v === 0 ? `${v}%` : v}
            </text>
          </g>
        ))}
        {TICKS.map(([m, label]) => (
          <text
            key={label + m}
            x={x(m)}
            y={B + 18}
            textAnchor="middle"
            fontSize="11"
            fill="var(--chakra-colors-fg-subtle)"
          >
            {label}
          </text>
        ))}
        <line
          x1={fx}
          x2={fx}
          y1={T}
          y2={B}
          stroke="var(--chakra-colors-primary-solid)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text
          x={fx + 8}
          y={T + 16}
          fontSize="11.5"
          fontWeight="600"
          fill="var(--chakra-colors-fg)"
        >
          Nov 2026: v2026 baseline, set frozen
        </text>
        {placed.flatMap((p) => {
          const barW = p.runId === hover.active ? BAR_W_ACTIVE : BAR_W;
          return p.segments.map((s) => (
            <rect
              key={`${p.runId}-${s.tier}`}
              x={p.px - barW / 2}
              y={s.top}
              width={barW}
              height={s.bottom - s.top}
              rx={2}
              fill={PASS_COLOR}
              opacity={
                TIER_OPACITY[s.tier] * (hover.dimmed(p.runId) ? DIMMED : 1)
              }
              style={{ transition: FADE }}
            />
          ));
        })}
        {placed.length < 2 ? (
          <text
            x={(fx + W - R) / 2}
            y={(T + B) / 2 + 5}
            textAnchor="middle"
            fontSize="15"
            fill="var(--chakra-colors-fg-muted)"
          >
            Scores from future runs will be added here
          </text>
        ) : (
          <polyline
            points={placed.map((p) => `${p.px},${p.py}`).join(" ")}
            fill="none"
            stroke={PASS_COLOR}
            strokeWidth={2}
            opacity={hover.active ? 0.45 : 1}
            style={{ transition: FADE }}
          />
        )}
        {placed.map((p) => (
          <circle
            key={p.runId}
            cx={p.px}
            cy={p.py}
            r={p.runId === hover.active ? DOT_R_ACTIVE : DOT_R}
            fill={PASS_COLOR}
            stroke="var(--chakra-colors-bg-panel)"
            strokeWidth={2}
            opacity={hover.dimmed(p.runId) ? DIMMED : 1}
            style={{ transition: FADE }}
          />
        ))}
        {activeIndex >= 0 ? (
          <line
            x1={placed[activeIndex].px}
            x2={placed[activeIndex].px}
            y1={T}
            y2={B}
            stroke="var(--chakra-colors-fg-subtle)"
            strokeWidth={1}
            pointerEvents="none"
          />
        ) : null}
        {last ? (
          <>
            <text
              x={last.px + 15}
              y={last.py + 4}
              fontSize="12.5"
              fontWeight="650"
              fill="var(--chakra-colors-fg)"
            >
              {pct(last.everyTime, 1)}
            </text>
            <text
              x={last.px + 15}
              y={last.py + 19}
              fontSize="10.5"
              fontFamily="monospace"
              fill="var(--chakra-colors-fg-muted)"
            >
              {draft ? "draft · every time" : "every time"}
            </text>
          </>
        ) : null}
        {placed.length ? (
          <rect
            x={L}
            y={T}
            width={W - L - R}
            height={B - T}
            fill="transparent"
            tabIndex={0}
            role="img"
            aria-label="Runs over time; use the left and right arrow keys to step between them."
            style={{ outline: "none" }}
            onPointerMove={onPointerMove}
            onPointerLeave={hover.clear}
            onFocus={() => activate(placed.length - 1)}
            onBlur={hover.clear}
            onKeyDown={onKeyDown}
          />
        ) : null}
      </svg>
      {hover.tooltip}
    </Box>
  );
}
