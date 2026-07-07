/**
 * Pure ISO-date helpers needed inside the model segment (filtersStore presets).
 * Lives in model — not lib — because FSD dependencies only point down and
 * model may not import lib. lib/format re-exports these for everyone else.
 */

/** Today's date as an ISO YYYY-MM-DD string (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Shift an ISO date by a number of days (negative = past). */
export function shiftIsoDate(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
