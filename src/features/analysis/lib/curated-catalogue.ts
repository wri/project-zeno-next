import { DATASET_BY_ID } from "@/app/constants/datasets";

/**
 * One curated (deterministic, LLM-free) analysis the backend can run for any
 * area: the catalogue dataset it is computed from, a one-line account of what
 * the resulting charts show, and how many chart cards to expect.
 */
export interface CuratedAnalysisEntry {
  datasetId: number;
  description: string;
  /**
   * Chart cards the generator yields, so a loading module can be laid out
   * before the run completes. Only the tree cover loss generator emits two
   * (annual loss plus annual GHG emissions, `charts/tcl.py`); land cover emits
   * one, either the composition pie or the transitions table
   * (`charts/land_cover.py`); every other generator emits one.
   */
  chartCountHint: 1 | 2;
}

/** A catalogue entry resolved against the FE dataset catalogue. */
export interface CuratedAnalysisSpec extends CuratedAnalysisEntry {
  datasetName: string;
}

/**
 * The curated analysis suite, in display order. Mirrors the chart generators
 * registered in project-zeno
 * `src/api/services/charts/registry.py::DETERMINISTIC_GENERATORS`, restricted
 * to datasets present in the FE catalogue (`app/constants/datasets.ts`): the
 * registry also covers 9 (sLUC emission factors) and 12 (LGMS), which the FE
 * does not expose, so they are deliberately absent. Keep this list in step
 * with the registry when a generator is added or removed.
 *
 * Names come from the FE catalogue at resolution time (`curatedCatalogue`),
 * so only the id, the analysis description and the chart hint live here.
 */
export const CURATED_ANALYSES: readonly CuratedAnalysisEntry[] = [
  {
    datasetId: 1,
    description:
      "Land cover composition and class-to-class transitions over the period",
    chartCountHint: 1,
  },
  {
    datasetId: 2,
    description: "Natural and semi-natural grassland extent by year",
    chartCountHint: 1,
  },
  {
    datasetId: 3,
    description: "Natural land area by class, largest first",
    chartCountHint: 1,
  },
  {
    datasetId: 4,
    description: "Annual tree cover loss and the GHG emissions it caused",
    chartCountHint: 2,
  },
  {
    datasetId: 5,
    description: "Tree cover gain per reporting period",
    chartCountHint: 1,
  },
  {
    datasetId: 6,
    description: "Gross emissions, gross removals and net forest carbon flux",
    chartCountHint: 1,
  },
  {
    datasetId: 7,
    description: "Tree cover extent for the area",
    chartCountHint: 1,
  },
  {
    datasetId: 8,
    description: "Tree cover loss by dominant driver",
    chartCountHint: 1,
  },
  {
    datasetId: 10,
    description: "Fire-related versus other tree cover loss by year",
    chartCountHint: 1,
  },
  {
    datasetId: 11,
    description: "Monthly disturbance alerts by confidence level",
    chartCountHint: 1,
  },
];

type DatasetLookup = Record<number, { dataset_name: string } | undefined>;

/** A trailing "(2001-2025)"-style range, hyphen or en dash, with optional spaces. */
const YEAR_RANGE_SUFFIX = /\s*\(\s*\d{4}\s*[-–]\s*\d{4}\s*\)\s*$/;

/**
 * Drops a trailing parenthetical year range from a catalogue dataset name
 * ("Forest greenhouse gas net flux (2001-2025)" -> "Forest greenhouse gas net
 * flux"). The range describes the dataset's coverage, which the analysis
 * window already expresses; in a "{dataset} in {area}" card title it only
 * reads as noise. Anything else in parentheses is left alone.
 */
export function stripYearRangeSuffix(name: string): string {
  return name.replace(YEAR_RANGE_SUFFIX, "");
}

/**
 * The curated suite with each dataset's catalogue name attached (minus any
 * trailing year range, see `stripYearRangeSuffix`). Throws when an entry
 * names a dataset the FE catalogue does not know: that is a configuration
 * error (the two lists drifted), and a card with no name would otherwise
 * render as "undefined in {area}".
 */
export function curatedCatalogue(
  byId: DatasetLookup = DATASET_BY_ID
): CuratedAnalysisSpec[] {
  return CURATED_ANALYSES.map((entry) => {
    const dataset = byId[entry.datasetId];
    if (!dataset) {
      throw new Error(
        `Curated dataset ${entry.datasetId} is missing from the FE catalogue`
      );
    }
    return {
      ...entry,
      datasetName: stripYearRangeSuffix(dataset.dataset_name),
    };
  });
}
