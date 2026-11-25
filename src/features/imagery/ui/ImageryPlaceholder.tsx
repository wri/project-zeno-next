/**
 * The satellite-imagery placeholder: a dark sea and a sand-coloured coast,
 * as on the design's imagery thumbnails. Shown while there is no scene
 * preview (searching, no scenes, a preview that failed to load).
 */
export function ImageryPlaceholder({ size }: { size: number | string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Satellite imagery"
    >
      <rect width="80" height="80" fill="#14304A" />
      <path
        d="M80 0H44c-2 6 3 10 1 16s-6 8-4 14 7 7 6 13-6 8-5 14 6 9 5 15-3 6-2 8h35z"
        fill="#C9A673"
      />
      <path
        d="M80 0H56c-1 5 2 9 1 14s-4 9-2 14 5 8 4 13-3 9-2 15 4 8 3 13-1 7 0 11h20z"
        fill="#D9BC8C"
      />
      <path
        d="M44 0c-2 6 3 10 1 16s-6 8-4 14 7 7 6 13-6 8-5 14 6 9 5 15-3 6-2 8"
        fill="none"
        stroke="#E8D3AC"
        strokeWidth="1.2"
        opacity="0.7"
      />
    </svg>
  );
}
