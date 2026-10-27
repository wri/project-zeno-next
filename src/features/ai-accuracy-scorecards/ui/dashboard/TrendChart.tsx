import { formatDay, pct } from "../../lib/format";
import { monthsSinceOrigin } from "../../lib/runs";
import { PASS_COLOR, TIER_OPACITY } from "../palette";

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
/** Width of the range bar stacked above each point. */
const BAR_W = 10;
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

/**
 * Headline accuracy (right every time) per canonical run of the version.
 * Points only; a line joins them once there are two or more. The shares are
 * nested (every time ⊆ most ⊆ some), so each point carries one bar stacked
 * upwards from it, tinted like the tier bar: up to "most of the time", then
 * on to "some of the time".
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

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{
        height: "auto",
        display: "block",
        fontFamily: "var(--chakra-fonts-body)",
      }}
      role="img"
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
      {placed.flatMap((p) =>
        p.segments.map((s) => (
          <rect
            key={`${p.runId}-${s.tier}`}
            x={p.px - BAR_W / 2}
            y={s.top}
            width={BAR_W}
            height={s.bottom - s.top}
            rx={2}
            fill={PASS_COLOR}
            opacity={TIER_OPACITY[s.tier]}
          />
        ))
      )}
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
        />
      )}
      {placed.map((p) => (
        <g key={p.runId}>
          <title>{`${formatDay(p.started)}${draft ? " · draft run" : ""}: ${pct(p.everyTime, 1)} accurate every time${p.majority == null ? "" : `, ${pct(p.majority, 1)} at least most of the time`}${p.anyTime == null ? "" : `, ${pct(p.anyTime, 1)} at least some of the time`}`}</title>
          <circle
            cx={p.px}
            cy={p.py}
            r={6.5}
            fill={PASS_COLOR}
            stroke="var(--chakra-colors-bg-panel)"
            strokeWidth={2}
          />
        </g>
      ))}
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
    </svg>
  );
}
