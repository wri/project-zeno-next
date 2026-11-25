import { useId } from "react";

/**
 * The satellite-imagery fallback icon from the design: a sea gradient with a
 * sand coastline on the right. Shown when there is no scene preview
 * (searching, no scenes found, or a preview that failed to load).
 *
 * The two design layers (80 × 80 sea, 52 × 80 coast aligned to the right
 * edge) are inlined in one SVG. Gradient ids are per instance, because the
 * card and the legend can show several placeholders at once.
 */
export function ImageryPlaceholder({ size }: { size: number | string }) {
  // useId contains ":" (or "«»"), which some browsers reject in url(#…).
  const id = `imagery-placeholder-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const sea = `${id}-sea`;
  const coast = `${id}-coast`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="No satellite imagery"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient
          id={sea}
          x1="0"
          y1="0"
          x2="80"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#12324B" />
          <stop offset="0.637192" stopColor="#1C4E63" />
          <stop offset="1" stopColor="#3E6E5E" />
        </linearGradient>
        <linearGradient
          id={coast}
          x1="15.9738"
          y1="0"
          x2="75.8774"
          y2="26.9758"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C9A96B" />
          <stop offset="1" stopColor="#8A6A3A" />
        </linearGradient>
      </defs>
      <path d="M80 0H0V80H80V0Z" fill={`url(#${sea})`} />
      <path
        transform="translate(28 0)"
        d="M24.1088 0H51.9997V80H7.49926C5.99926 79.3203 10.9755 75.7609 3.5 70.5C-1 68.5 0.5 55.5792 6.7071e-09 53C-0.000241092 47.5 6.49965 39.5 7.49926 32.5C9.14149 21 18.5244 20 24.1088 17.3913V0Z"
        fill={`url(#${coast})`}
      />
    </svg>
  );
}
