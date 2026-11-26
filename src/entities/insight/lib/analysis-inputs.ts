import {
  AnalysisInputsWireSchema,
  type AnalyzedArea,
  type AnalyzedDataset,
  type AnalyzedYears,
  type AnalysisInputs,
} from "../model/analysis-inputs";

const NOT_RECORDED: AnalysisInputs = { recorded: false };

/** The first item per key, in input order. */
function distinctBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const year = (isoDate: string): number => Number(isoDate.slice(0, 4));

/**
 * Parses an insight's `analysis_inputs` into the inputs every chip and panel
 * shows. The only reader of the wire shape. Absent, null and an empty list all
 * mean "not recorded". The field is display-only, so a payload that fails the
 * schema is also "not recorded", logged once with the insight id, rather than
 * hiding the chart it describes.
 */
export function toAnalysisInputs(
  raw: unknown,
  insightId: string | undefined
): AnalysisInputs {
  if (raw === undefined) return NOT_RECORDED;
  const parsed = AnalysisInputsWireSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      `[analysis_inputs] unreadable for insight ${insightId ?? "(no id)"}`,
      parsed.error.issues
    );
    return NOT_RECORDED;
  }
  const pulls = parsed.data;
  if (!pulls?.length) return NOT_RECORDED;

  const areas = pulls.flatMap((pull) =>
    pull.areas.map(
      ({ name, source, src_id }): AnalyzedArea =>
        source !== null && src_id !== null
          ? { name, ref: { source, srcId: src_id } }
          : { name }
    )
  );
  const datasets = pulls.map(
    ({ dataset_id, dataset_name }): AnalyzedDataset =>
      dataset_id !== null
        ? { name: dataset_name, id: dataset_id }
        : { name: dataset_name }
  );
  // The threshold the backend sent upstream, under any context layer
  // (natural forest included); null where it sent none.
  const canopyCover = pulls.flatMap(({ canopy_cover }) =>
    canopy_cover !== null ? [canopy_cover] : []
  );
  const years = pulls.map(
    ({ pulled_start_date, pulled_end_date }): AnalyzedYears => ({
      start: year(pulled_start_date),
      end: year(pulled_end_date),
    })
  );

  return {
    recorded: true,
    // Area identity is source + id; a name alone only when the ids are
    // unknown. Same-name areas (Santa Cruz, ARG and BOL) stay two areas.
    areas: distinctBy(areas, (a) =>
      a.ref ? `${a.ref.source}:${a.ref.srcId}` : `name:${a.name}`
    ),
    datasets: distinctBy(datasets, (d) =>
      d.id !== undefined ? `id:${d.id}` : `name:${d.name}`
    ),
    canopyCover: [...new Set(canopyCover)],
    years: distinctBy(years, (y) => `${y.start}-${y.end}`),
  };
}

/** The dataset of a single-dataset analysis; undefined for any other. */
export function soleDataset(
  inputs: AnalysisInputs | undefined
): AnalyzedDataset | undefined {
  return inputs?.recorded && inputs.datasets.length === 1
    ? inputs.datasets[0]
    : undefined;
}
