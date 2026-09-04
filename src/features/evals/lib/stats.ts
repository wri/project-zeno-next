/**
 * Wilson score interval, ported from gnw-gold-evals
 * `tools/challenge_rollup.py::wilson` — a published "70%" from 12 cases
 * must say how soft it is.
 */

export const Z_95 = 1.96;

export interface Interval {
  low: number;
  high: number;
}

/** Wilson interval for a binomial proportion; (0, 1) when n = 0. */
export function wilson(passed: number, n: number, z: number = Z_95): Interval {
  if (n === 0) return { low: 0, high: 1 };
  const p = passed / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half =
    (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return {
    low: Math.max(0, centre - half),
    high: Math.min(1, centre + half),
  };
}

/**
 * "± N pts between repeats", ported from the GOLD report template
 * (templates/run-report.html): re-score every row with each trial's checks
 * alone (uncovered is never a pass; entry-level errors are ignored, as in
 * the template) and take the sample std (n-1) of the per-trial pass rates,
 * in percentage points. Null on 1-trial runs or empty rows.
 */
export function trialSpreadPts(
  rows: readonly {
    trials: readonly { checks: Record<string, number | null> }[];
  }[],
  numTrials: number,
  isInfoOnly: (check: string) => boolean
): number | null {
  if (numTrials < 2 || rows.length === 0) return null;
  const rates: number[] = [];
  for (let k = 0; k < numTrials; k += 1) {
    let pass = 0;
    for (const row of rows) {
      const checks = row.trials[k]?.checks ?? {};
      let evaluated = 0;
      let failed = false;
      for (const [name, value] of Object.entries(checks)) {
        if (isInfoOnly(name) || value === null) continue;
        evaluated += 1;
        if (value === 0) failed = true;
      }
      if (evaluated > 0 && !failed) pass += 1;
    }
    rates.push(pass / rows.length);
  }
  if (rates.length < 2) return null;
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance =
    rates.reduce((a, r) => a + (r - mean) ** 2, 0) / (rates.length - 1);
  return Math.sqrt(variance) * 100;
}
