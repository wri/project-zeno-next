/** Display formatting helpers (pure; no locale surprises in tests). */

/** 0.8264 -> "82.6%"; null -> an en-dash placeholder. */
export function fmtPct(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "–";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Wilson interval as "75.6–88.0%". */
export function fmtCI(low: number, high: number): string {
  return `${(low * 100).toFixed(1)}–${(high * 100).toFixed(1)}%`;
}

/** "2026-08-31T16:33:47Z" -> "2026-08-31". */
export function fmtRunDate(started: string): string {
  return started.slice(0, 10);
}

/** Seconds -> compact "2m 6s" / "36s" for latency cells. */
export function fmtLatency(seconds: number | null): string {
  if (seconds === null) return "–";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
}
