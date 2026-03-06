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
  createdAt: string;
  updatedAt: string;
}
