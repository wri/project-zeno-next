/**
 * Round-number axis ticks for the curated LGMS charts.
 *
 * Recharts' automatic ticks land on the padded data bounds and read as noise
 * (`-216.4 183.6 906.4`); the design instead shows round multiples of a nice
 * step (`-500 0 500`). Zero is a multiple of every step, so the zero line is
 * always labelled — which is the property the axis must never lose.
 */

/** Round step at or above `raw`, from the usual 1/2/2.5/5/10 ladder. */
export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const base = raw / magnitude;
  const nice = [1, 2, 2.5, 5, 10].find((candidate) => candidate >= base) ?? 10;
  return nice * magnitude;
}

/**
 * Aim for six intervals, not five.
 *
 * The step is rounded *up* to a nice value, so the realised tick count always
 * comes in under the target — six lands on 3–6 ticks across every domain shape
 * the two curated charts produce. Five was too coarse: the annual-average gross
 * domain (`[-844, 1694]`) rounded up to a step of 1000 and collapsed the axis to
 * `0 · 1000`, losing the whole negative end. Six gives that domain a step of 500
 * and reproduces the design's `-500 0 500 1000 1500` exactly, while leaving the
 * net domain's `-500 0 500` unchanged.
 */
const TARGET_INTERVALS = 6;

/** Ticks at round multiples of a nice step, always including zero. */
export function niceTicks([min, max]: [number, number]): number[] {
  const step = niceStep((max - min) / TARGET_INTERVALS);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) {
    // Snap to the step grid so float drift can't produce 499.9999.
    const snapped = Math.round(t / step) * step;
    // A zero tick approached from below comes out of `Math.round` as -0, which
    // `Intl.NumberFormat` renders as the string "-0".
    ticks.push(snapped === 0 ? 0 : snapped);
  }
  return ticks;
}

/**
 * Tick labels as the design prints them: plain integers, no compact "1.5K" and
 * no thousands separator. `maximumFractionDigits` also absorbs the float drift a
 * sub-1 step leaves behind (`0.6000000000000001`) — reachable now that values
 * are scaled to megatonnes, where a small AOI can land under 1 Mt.
 */
const tickLabel = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function formatTick(value: number): string {
  return tickLabel.format(value);
}
