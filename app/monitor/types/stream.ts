// ---------------------------------------------------------------------------
// Stream event types for GET /api/labs/monitoring/stream
// Mirrors the Pydantic models in project-zeno src/api/schemas.py
// ---------------------------------------------------------------------------

/** AOI (Area of Interest) resolved by the backend. */
export interface AOI {
  name: string;
  aoi_type: string;
  subtype: string;
  src_id: string;
  gadm_id?: string | null;
  query_description?: string;
}

/** AOI selection grouping. */
export interface AOISelection {
  name: string;
  aois: AOI[];
}

/** Date range. */
export interface DateRange {
  start_date: string;
  end_date: string;
}

/** Dataset configuration returned in metadata. */
export interface Dataset {
  dataset_id: number;
  dataset_name: string;
  reason: string;
  tile_url: string;
  context_layer: string | null;
  prompt_instructions: string;
  cautions: string;
  description: string;
  methodology: string;
  citation: string;
}

/** A single analytics data source. */
export interface AnalyticsDataItem {
  dataset_name: string;
  start_date: string;
  end_date: string;
  source_url: string;
  aoi_names: string[];
  data: {
    data?: Record<string, unknown>[];
    [key: string]: unknown;
  };
}

/** Chart data for visualisation. */
export interface ChartData {
  id: string;
  title: string;
  type: string;
  insight: string;
  data: Record<string, unknown>[];
  xAxis: string;
  yAxis: string;
  colorField: string;
  stackField: string;
  groupField: string;
  seriesFields: string[];
}

/** Code execution part. */
export interface CodeActPart {
  type: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Stream events
// ---------------------------------------------------------------------------

export interface MetadataEvent {
  type: "metadata";
  data: {
    query: string;
    date_range: DateRange;
    aoi_selection: AOISelection;
    dataset: Dataset;
  };
}

export interface AnalyticsDataEvent {
  type: "analytics_data";
  data: {
    analytics_data: AnalyticsDataItem[];
  };
}

export interface InsightsEvent {
  type: "insights";
  data: {
    insights: string[];
    charts_data: ChartData[];
    codeact_parts: CodeActPart[];
    follow_up_suggestions: string[];
    insights_error: string | null;
  };
}

export interface ErrorEvent {
  type: "error";
  data: {
    message: string;
  };
}

export interface CompleteEvent {
  type: "complete";
  data: null;
}

export type StreamEvent =
  | MetadataEvent
  | AnalyticsDataEvent
  | InsightsEvent
  | ErrorEvent
  | CompleteEvent;

// ---------------------------------------------------------------------------
// Streaming status
// ---------------------------------------------------------------------------

export type StreamStatus =
  | "idle"
  | "connecting"
  | "metadata"
  | "analytics"
  | "insights"
  | "complete"
  | "error";

// ---------------------------------------------------------------------------
// Per-dataset stream state
// ---------------------------------------------------------------------------

/** State accumulated for a single dataset's stream. */
export interface DatasetStreamState {
  datasetId: number;
  status: StreamStatus;
  statusMessage: string;
  query: string | null;
  dateRange: DateRange | null;
  aoiSelection: AOISelection | null;
  dataset: Dataset | null;
  analyticsData: AnalyticsDataItem[];
  error: string | null;
}

// ---------------------------------------------------------------------------
// Aggregate status across all parallel streams
// ---------------------------------------------------------------------------

export type AggregateStatus =
  | "idle"
  | "streaming"
  | "partial"
  | "complete"
  | "error";

// ---------------------------------------------------------------------------
// Form values for multi-dataset query
// ---------------------------------------------------------------------------

export interface MultiDatasetFormValues {
  datasetIds: number[];
  areaIds: string[];
  startDate: string;
  endDate: string;
  prompt: string;
}

// ---------------------------------------------------------------------------
// Chart auto-detection
// ---------------------------------------------------------------------------

export type DetectedChartType =
  | "bar"
  | "line"
  | "area"
  | "stacked-bar"
  | "grouped-bar"
  | "pie"
  | "scatter";

export interface DetectedChartConfig {
  type: DetectedChartType;
  xAxis: string;
  yAxis: string;
  colorField?: string;
  pivotedData?: Record<string, unknown>[];
  label: string;
}

// ---------------------------------------------------------------------------
// Summary endpoint
// ---------------------------------------------------------------------------

export interface SummaryRequest {
  prompt: string;
  analytics_data: AnalyticsDataItem[];
  datasets: SummaryDatasetConfig[];
}

export interface SummaryDatasetConfig {
  dataset_id: number;
  dataset_name: string;
  prompt_instructions: string;
  cautions: string;
}

export interface SummaryResponse {
  insights: string[];
  charts_data: ChartData[];
  codeact_parts: CodeActPart[];
  follow_up_suggestions: string[];
  insights_error: string | null;
}

// ---------------------------------------------------------------------------
// Wizard / Builder flow types
// ---------------------------------------------------------------------------

export type WizardPhase =
  | "setup"
  | "streaming"
  | "review"
  | "summary"
  | "dashboard";

export interface ChartSelection {
  datasetId: number;
  chartLabel: string;
  config: DetectedChartConfig;
  rows: Record<string, unknown>[];
  isPrimary: boolean;
  /** When set, per-area charts sharing the same group key are merged into a
   *  single dashboard block with an area selector. */
  perAreaGroup?: string;
}

export interface DashboardState {
  selectedCharts: ChartSelection[];
  summaryInsights: string[];
  summaryPrompt: string;
}
