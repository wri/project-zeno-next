import { ReportBlock } from "./report";

/**
 * Metadata capturing how the dashboard was set up via the wizard.
 * Stored so "Add Insight" can re-use the same parameters.
 */
export interface DashboardSetupMetadata {
  datasetIds: number[];
  areaIds: string[];
  startDate: string;
  endDate: string;
  prompt: string;
}

/** Raw data snapshot for a single dataset, preserved for the data table. */
export interface DatasetRawData {
  datasetId: number;
  datasetName: string;
  rows: Record<string, unknown>[];
}

/**
 * A Dashboard is a Report created via the monitor wizard.
 * After creation, its blocks are ReportBlock[] rendered by the
 * same canvas components used for reports.
 */
export interface Dashboard {
  id: string;
  title: string;
  blocks: ReportBlock[];
  setupMetadata: DashboardSetupMetadata;
  /** Raw analytics rows per dataset, preserved for the data table & CSV export. */
  rawData?: DatasetRawData[];
  createdAt: string;
  updatedAt: string;
}
