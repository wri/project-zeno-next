"use client";

import type { ChartType } from "@/app/types/portfolio";

type Props = {
  type: ChartType;
  size?: number;
  color?: string;
};

// Inline SVG iconography for insight cards and grid blocks.
// Matches the chartType union so non-chart fallbacks render a bar shape.
export default function ChartIcon({
  type,
  size = 20,
  color = "currentColor",
}: Props) {
  if (type === "line" || type === "area") {
    return (
      <svg
        width={size}
        height={(size * 14) / 20}
        viewBox="0 0 20 14"
        style={{ flexShrink: 0, color }}
        aria-hidden
      >
        <polyline
          points="0,12 4,8 8,10 12,4 16,7 20,3"
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "pie") {
    return (
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 14 14"
        style={{ flexShrink: 0, color }}
        aria-hidden
      >
        <circle
          cx="7"
          cy="7"
          r="6"
          fill="none"
          stroke={color}
          strokeWidth={1.2}
        />
        <path d="M7,7 L7,1 A6,6 0 0,1 13,10.2 Z" fill={color} opacity={0.55} />
      </svg>
    );
  }

  if (type === "scatter") {
    return (
      <svg
        width={size}
        height={(size * 14) / 20}
        viewBox="0 0 20 14"
        style={{ flexShrink: 0, color }}
        aria-hidden
      >
        <circle cx="3" cy="10" r="1.5" fill={color} opacity={0.6} />
        <circle cx="7" cy="6" r="1.5" fill={color} opacity={0.8} />
        <circle cx="11" cy="3" r="1.5" fill={color} />
        <circle cx="14" cy="9" r="1.5" fill={color} opacity={0.55} />
        <circle cx="17" cy="5" r="1.5" fill={color} opacity={0.75} />
      </svg>
    );
  }

  // bar (default)
  return (
    <svg
      width={size}
      height={(size * 14) / 20}
      viewBox="0 0 20 14"
      style={{ flexShrink: 0, color }}
      aria-hidden
    >
      <rect x="0" y="5" width="4" height="9" fill={color} rx="0.5" opacity={0.6} />
      <rect x="5" y="2" width="4" height="12" fill={color} rx="0.5" opacity={0.85} />
      <rect x="10" y="0" width="4" height="14" fill={color} rx="0.5" />
      <rect x="15" y="4" width="4" height="10" fill={color} rx="0.5" opacity={0.5} />
    </svg>
  );
}
