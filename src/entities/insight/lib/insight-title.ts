export interface InsightTitleInput {
  datasetName: string;
  /** Resolved geographic name for the analysis, e.g. "Para". May be missing. */
  locationName?: string;
  /** The area's own label — always present, used when locationName isn't. */
  areaLabel: string;
}

/** Generates a curated insight's title as "{dataset} in {location}". */
export function generateInsightTitle({
  datasetName,
  locationName,
  areaLabel,
}: InsightTitleInput): string {
  const location = locationName?.trim() ? locationName : areaLabel;
  return `${datasetName} in ${location}`;
}
