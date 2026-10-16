import type { DatasetInfo } from "@/app/types/chat";

/** One-line dataset summary shown under its name: "annual · global · UMD". */
export function datasetMeta(
  d: Pick<DatasetInfo, "cadence" | "geographic_coverage" | "provider">
): string | undefined {
  return (
    [d.cadence, d.geographic_coverage, d.provider]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}
