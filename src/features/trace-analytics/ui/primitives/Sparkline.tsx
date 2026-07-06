"use client";

import { useId } from "react";

interface SparklineProps {
  readonly values: readonly number[];
  readonly color?: string;
  readonly height?: number;
}

const WIDTH = 120;

/** Tiny inline area chart for KPI tiles — trend shape only, no axes. */
export function Sparkline({
  values,
  color = "#7898D7",
  height = 32,
}: SparklineProps) {
  const gradientId = useId();
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return null;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const pad = 2;
  const innerH = height - pad * 2;

  const points = finite.map((v, i) => {
    const x = (i / (finite.length - 1)) * WIDTH;
    const y = pad + innerH * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${WIDTH},${height} L0,${height} Z`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
