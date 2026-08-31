/**
 * Megagrams (metric tons) → megatonnes. The LGMS backend's flux fields are
 * named `..._MgCO2e` / `..._MgCO2` (Mg = megagram = 1 metric ton) and are
 * summed/averaged without any scaling (`src/api/services/charts/lgms.py`),
 * so a land-scale analysis routinely lands in the hundreds of millions of
 * tons. The curated charts label their axis "Mt CO2e/yr", so every value on
 * that path must be scaled down by 1,000,000 before display.
 */
export function mgToMt(value: number): number {
  return value / 1_000_000;
}
