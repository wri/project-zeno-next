import { DATASET_BY_ID, NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";

/**
 * One curated (deterministic, LLM-free) analysis the backend can run for any
 * area: the catalogue dataset it is computed from, a one-line account of what
 * the resulting charts show, and how many chart cards to expect.
 */
export interface CuratedAnalysisEntry {
  datasetId: number;
  description: string;
  /**
   * Chart *cards* the analysis yields, so a loading module can be laid out
   * before the run completes — not always the number of charts the generator
   * returns. Only the tree cover loss generator emits two (annual loss plus
   * annual GHG emissions, `charts/tcl.py`); land cover emits one, either the
   * composition pie or the transitions table (`charts/land_cover.py`); LGMS
   * emits four that render as two (see its entry); every other generator
   * emits one.
   */
  chartCountHint: 1 | 2;
  /**
   * Hidden until this `?ff=` flag is opted into. Absent means always offered.
   */
  featureFlag?: string;
  /**
   * AOI sources the analysis can be computed for (`aois.source`: "gadm",
   * "kba", "wdpa", "landmark", "custom"). Absent means every source. An entry
   * is hidden rather than left to fail for an area its dataset does not
   * cover.
   */
  aoiSources?: readonly string[];
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
 * registry also covers 9 (sLUC emission factors), which the FE does not
 * expose, so it is deliberately absent. Keep this list in step with the
 * registry when a generator is added or removed.
 *
 * Entries may be gated (`featureFlag`, `aoiSources`); `curatedCatalogue`
 * applies both, and every surface offering curated analyses reads it through
 * that function so a gated entry cannot appear on one surface only.
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
    // The analytics API fails the job for protected areas and KBAs ("Analysis
    // failed. Result is not available.", verified 2026-09-24, PZB-1450). Lift
    // once upstream supports them.
    aoiSources: ["gadm"],
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
  {
    datasetId: 12,
    description: "Annual GHG emissions and removals from land",
    // `charts/lgms.py` returns four: the annual-average hierarchy, then the
    // Full detail / Category / Summary time series. The three time series
    // fold into one card behind the DETAIL pill (`collapseNetFluxRollups`),
    // so two land.
    chartCountHint: 2,
    // Still under review with the science team; opt in with `?ff=net-flux`,
    // the same flag that reveals the LGMS dataset card in the catalogue.
    featureFlag: NET_FLUX_FEATURE_FLAG,
    // The upstream analytics service covers GADM administrative areas only —
    // a KBA, protected area, Landmark or custom area has no LGMS inventory
    // and the job would fail rather than return nothing.
    aoiSources: ["gadm"],
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

export interface CuratedCatalogueOptions {
  /** Flags opted into by the URL; an entry's `featureFlag` must be in here. */
  enabledFlags?: ReadonlySet<string>;
  /** The area the analyses will run for; filters entries by `aoiSources`. */
  aoiSource?: string;
  /** The FE dataset catalogue to resolve names against. Injectable for tests. */
  byId?: DatasetLookup;
}

/** Whether `entry` covers areas from `aoiSource` (any casing; "GADM" is a map layer id). */
function coversSource(entry: CuratedAnalysisEntry, aoiSource: string): boolean {
  return (
    !entry.aoiSources || entry.aoiSources.includes(aoiSource.toLowerCase())
  );
}

/** Whether this entry is offered at all, given the flags and the area. */
function isOffered(
  entry: CuratedAnalysisEntry,
  { enabledFlags, aoiSource }: CuratedCatalogueOptions
): boolean {
  if (entry.featureFlag && !enabledFlags?.has(entry.featureFlag)) return false;
  // Without a known area nothing is filtered by source: the caller is asking
  // what the suite holds, not what it can run here.
  return aoiSource === undefined || coversSource(entry, aoiSource);
}

/**
 * Whether a dataset's analysis can run for an area from `aoiSource` — false
 * only when its curated entry restricts sources and excludes this one. Feature
 * flags are not considered: this answers "is the area covered?", for surfaces
 * that pick the dataset some other way (the map's active layer).
 */
export function isAnalysableForSource(
  datasetId: number,
  aoiSource: string
): boolean {
  const entry = CURATED_ANALYSES.find((e) => e.datasetId === datasetId);
  return !entry || coversSource(entry, aoiSource);
}

/**
 * The curated suite, gated (see `isOffered`) and with each dataset's catalogue
 * name attached (minus any trailing year range, see `stripYearRangeSuffix`).
 * Throws when an offered entry names a dataset the FE catalogue does not know:
 * that is a configuration error (the two lists drifted), and a card with no
 * name would otherwise render as "undefined in {area}".
 */
export function curatedCatalogue(
  options: CuratedCatalogueOptions = {}
): CuratedAnalysisSpec[] {
  const byId = options.byId ?? DATASET_BY_ID;
  return CURATED_ANALYSES.filter((entry) => isOffered(entry, options)).map(
    (entry) => {
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
    }
  );
}
