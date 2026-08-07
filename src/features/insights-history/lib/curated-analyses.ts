import { DATASET_CARDS } from "@/app/constants/datasets";
// Deep import (not the feature barrel) for the same reason as the ui files:
// keep bundles lean and rule out feature import cycles.
import {
  DEFAULT_END_DATE,
  DEFAULT_START_DATE,
} from "@/src/features/analysis/lib/default-analysis-window";

/**
 * Datasets that can be analysed through the deterministic `POST /api/analyze`
 * route. The source of truth is the backend's `DETERMINISTIC_GENERATORS`
 * registry (project-zeno `src/api/services/charts.py`): a dataset with no
 * registered chart generator completes its job with zero charts, so only ids
 * with a generator belong here. Extend this list as generators land.
 */
export const CURATED_ANALYSIS_DATASET_IDS: readonly number[] = [
  4, // Tree cover loss (TCLChartGenerator — loss + GHG emissions charts)
  11, // Integrated alerts (IntegratedAlertsChartGenerator)
];

/**
 * A predefined analysis the Curated pane offers on a dashboard: a dataset plus
 * the date window to analyse. The area is not part of the template — it is
 * always the dashboard's own AOI, supplied at run time.
 */
export interface CuratedAnalysisTemplate {
  datasetId: number;
  datasetName: string;
  /** Data provider shown on the card (e.g. "UMD"), when the catalogue has one. */
  provider?: string;
  /** ISO date "yyyy-MM-dd". */
  startDate: string;
  /** ISO date "yyyy-MM-dd". */
  endDate: string;
}

/**
 * The curated analysis templates, in `CURATED_ANALYSIS_DATASET_IDS` order —
 * a constant because both inputs are compile-time catalogue data. Ids missing
 * from the dataset catalogue are dropped (a template must have a name to
 * title its insight), so a stale id can never render a broken card. Dates
 * come from the catalogue entry's default years when pinned, else the shared
 * default analysis window.
 */
export const CURATED_ANALYSIS_TEMPLATES: readonly CuratedAnalysisTemplate[] =
  CURATED_ANALYSIS_DATASET_IDS.flatMap((datasetId) => {
    const card = DATASET_CARDS.find((c) => c.dataset_id === datasetId);
    if (!card) return [];
    return [
      {
        datasetId,
        datasetName: card.dataset_name,
        provider: card.provider,
        startDate: card.defaultStartYear
          ? `${card.defaultStartYear}-01-01`
          : DEFAULT_START_DATE,
        endDate: card.defaultEndYear
          ? `${card.defaultEndYear}-12-31`
          : DEFAULT_END_DATE,
      },
    ];
  });
