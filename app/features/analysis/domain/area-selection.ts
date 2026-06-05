/** The area a user selected on the map, normalized for analysis. Grows as needed. */
export interface AreaSelection {
  name: string;
  source: string;
  // Undefined is possible: the source feature may not carry an id/subtype.
  srcId?: string;
  subtype?: string;
}
