/** A dataset that can be requested for analysis. Grows as needed. */
export interface Dataset {
  id: number;
  /** Display name, when known — used to generate the insight's title. */
  name?: string;
}
