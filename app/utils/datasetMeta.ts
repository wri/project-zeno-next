import type { DatasetInfo } from "@/app/types/chat";

/** The fields that summarise a dataset under its name (and that search matches). */
export const DATASET_META_FIELDS = [
  "cadence",
  "geographic_coverage",
  "provider",
] as const;

/** One-line dataset summary shown under its name: "annual · global · UMD". */
export function datasetMeta(
  d: Pick<DatasetInfo, (typeof DATASET_META_FIELDS)[number]>
): string | undefined {
  return (
    DATASET_META_FIELDS.map((f) => d[f])
      .filter(Boolean)
      .join(" · ") || undefined
  );
}
