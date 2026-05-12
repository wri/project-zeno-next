import type { FeatureCollection } from "geojson";

// The portfolio prototype's local-only data model.
// Persisted to localStorage via Zustand's persist middleware
// (keys: gnw_insights, gnw_reports, gnw_dashboards).

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

export interface PinnedAoi {
  name: string;
  // src_ids: empty for custom/drawn/uploaded AOIs, otherwise the
  // GADM/KBA/etc src_id of each AOI in the group.
  src_ids: string[];
  source: string;
  isMultiArea: boolean;
  bbox?: [number, number, number, number];
  // Snapshotted from layerManager.geoJsonRegistry at pin time so the
  // map card can render without a backend round-trip. May be omitted
  // if the geometry was not available at that moment.
  geometry?: FeatureCollection;
}

export interface PinnedInsight {
  id: string;
  title: string;
  description?: string;
  datasetName?: string;
  chartType: ChartType;
  aoi: PinnedAoi;
  threadId?: string;
  pinnedAt: string; // ISO timestamp
  // Snapshot of the chart-relevant payload so blocks can show a mini-chart.
  data?: unknown;
  xAxis?: string;
  yAxis?: string;
}

export type BlockType = "insight" | "annotation" | "map";

// Block size in the 2-column canvas grid. "default" spans 1 column,
// "wide" spans 2 columns. Persisted blocks may omit this — treat
// missing as "default".
export type BlockSize = "default" | "wide";

export interface Block {
  id: string;
  type: BlockType;
  insightId?: string; // when type === "insight"
  text?: string; // when type === "annotation"
  aoi?: PinnedAoi; // when type === "map"
  size?: BlockSize;
}

export interface Report {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

export interface AreaDashboard {
  id: string;
  name: string;
  aoi: PinnedAoi;
  seededFromInsightId: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

// Soft caps surfaced in the UI as informational counts. Not enforced.
export const REPORT_INSIGHT_LIMIT = 15;
export const REPORTS_PER_USER_LIMIT = 5;
