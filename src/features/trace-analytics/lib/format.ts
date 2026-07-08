/** Formatting helpers (ported from tracey's data_helpers.py). */

/** Format an ISO date (YYYY-MM-DD) as e.g. "Mon 3rd Jun". */
export function formatReportDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "?";
  const dt = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return String(isoDate);

  const day = dt.getUTCDate();
  const mod100 = day % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ??
        "th");

  const weekday = dt.toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
  const month = dt.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  return `${weekday} ${day}${suffix} ${month}`;
}

/** Thousands-separated integer, e.g. 12,345. */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Compact count for dense axes, e.g. 12400 → "12.4K". */
export function formatCompact(n: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Percentage with one decimal, e.g. "12.3%". */
export function formatPercent(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** USD with four decimals, e.g. "$0.0123". */
export function formatUsd(value: number, decimals = 4): string {
  return `$${value.toFixed(decimals)}`;
}

/** Seconds with two decimals, e.g. "1.23s". */
export function formatSeconds(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}s`;
}

/** ISO 639-1 code → English language name, e.g. "es" → "Spanish". */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Collapse whitespace and truncate to maxLen, appending an ellipsis. */
export function snippet(text: string | null | undefined, maxLen = 120): string {
  const clean = String(text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}…`;
}

/**
 * Normalize a prompt for comparison: lowercase, collapse whitespace and strip
 * trailing dots (matches tracey's normalize_prompt).
 */
export function normalizePrompt(text: unknown): string {
  if (typeof text !== "string") return "";
  let out = text.trim().split(/\s+/).join(" ").toLowerCase();
  while (out.endsWith(".")) {
    out = out.slice(0, -1).trimEnd();
  }
  return out;
}

/** Inclusive number of days between two ISO dates. */
export function inclusiveDays(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export { todayIso, shiftIsoDate } from "../model/dates";
