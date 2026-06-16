import { ContextItem } from "../store/contextStore";
import { FeatureCollection } from "geojson";

// Type for storing tool execution data
export interface ToolStepData {
  name: string;
  content?: string;
  dataset?: object;
  insights?: object[];
  charts_data?: object[];
  codeact_parts?: CodeActPart[];
  source_urls?: string[];
  aoi?: object;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  type:
    | "user"
    | "assistant"
    | "system"
    | "widget"
    | "area-card"
    | "error"
    | "warning"
    | "dataset-nudge";
  message: string;
  timestamp: string;
  widgets?: InsightWidget[]; // For widget messages
  aoiSelection?: AOISelection; // For area-card messages
  suggestedDatasets?: SuggestedDataset[]; // For dataset-nudge messages
  context?: ContextItem[];
  traceId?: string;
  toolSteps?: ToolStepData[]; // For user messages - reasoning steps taken to respond
  reasoningDuration?: number; // Duration in seconds for reasoning to complete
  suppressFooter?: boolean; // Non-terminal segment of a [Chart uuid] split — no footer, tight spacing
}

// Widget types for insights
export interface InsightWidget {
  id?: string; // backend chart UUID, used to resolve [Chart <id>] references in text
  type:
    | "line"
    | "bar"
    | "table"
    | "dataset-card"
    | "pie"
    | "stacked-bar"
    | "grouped-bar"
    | "area"
    | "scatter";
  title: string;
  description: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
  seriesFields?: string[];
  datasetName?: string;
  generation?: InsightGeneration; // Optional provenance for how the widget was generated
  analysisParams?: AnalysisParams; // Parameters used by the agent to produce this insight
}

// Parameters the agent used to produce an insight (read-only transparency)
export interface AnalysisParams {
  areas?: string[]; // e.g. ["Pará, Brazil", "KBAs"]
  dataset?: string; // e.g. "Tree cover loss"
  canopyThreshold?: number; // e.g. 30 (percentage)
  startYear?: number;
  endYear?: number;
}

// Raw insight data from API (before conversion to InsightWidget)
export interface RawInsightData {
  type: string;
  title: string;
  description: string;
  data: unknown;
}

export type CodeActPartType = "text_output" | "code_block" | "execution_output";

export interface CodeActPart {
  type: CodeActPartType;
  content: string; // base64 encoded
}

// Step-wise provenance attached to an insight/tool result
export interface InsightGeneration {
  codeact_parts?: CodeActPart[];
  source_urls?: string[]; // optional sources used
}

export interface ChatPrompt {
  query: string;
  query_type: string;
  thread_id: string;
  // Feature flag selecting the agent tool profile (admin-gated server-side).
  ff?: string;
}
export interface UiContext {
  aoi_selected?: {
    aoi: {
      name: string;
      gadm_id?: string;
      src_id?: string;
      subtype?: string;
      source?: string;
    };
    aoi_name: string;
    subtype?: string;
  };
  dataset_selected?: { dataset: DatasetInfo };
  daterange_selected?: {
    start_date: string;
    end_date: string;
  };
}

export interface ChatAPIRequest {
  query: string;
  query_type: string;
  thread_id: string;
  ui_context?: UiContext;
}

// Simplified message that our API sends to the client
export interface StreamMessage {
  type: "text" | "tool" | "other" | "error" | "human";
  text?: string;
  tool?: Record<string, unknown>;
  name?: string;
  content?: string;
  dataset?: object;
  suggested_datasets?: SuggestedDataset[];
  aoi?: object;
  aoi_selection?: AOISelection;
  imagery?: ImageryInfo;
  insights?: object[];
  charts_data?: object[];
  codeact_parts?: CodeActPart[];
  source_urls?: string[];
  insight_count?: number;
  timestamp: string;
  start_date?: string;
  end_date?: string;
  trace_id?: string;
}

// Sentinel-2 mosaic payload written to agent state by the show_imagery tool.
// tile_url / tilejson_url are absolute URLs to the titiler the backend is
// configured to use (its MOSAIC_TILER_URL). When that titiler is the Zeno API
// itself, the /mosaic routes require bearer auth.
export interface ImageryInfo {
  tile_url: string;
  tilejson_url: string;
  mosaic_id: string;
  // Scene count and acquired date range are only known when the mosaic is
  // built; on a cache hit (mosaic already in S3) the backend omits them.
  item_count?: number;
  date_start?: string;
  date_end?: string;
  target_date: string;
  aoi_names: string[];
  // Search constraints used to build the mosaic. Absent on payloads created
  // before these were introduced (replayed old threads).
  window_days?: number;
  max_cloud_cover?: number;
}

export interface AOI {
  name: string;
  src_id: string;
  source: string;
  subtype: string;
  geometry?: FeatureCollection; // Optional since it may not be included in the initial response
  bbox?: [number, number, number, number]; // [west, south, east, north] — may cross dateline (west > east)
}

export interface AOISelection {
  name: string;
  aois: AOI[];
}

export interface DatasetContextLayer {
  name: string;
  tile_url: string | null;
}

export interface DatasetParameter {
  name: string;
  values: unknown[];
}

export interface SuggestedDataset {
  dataset_id: number;
  dataset_name: string;
  context_layer?: string | null;
  parameters?: DatasetParameter[] | null;
  start_date?: string;
  end_date?: string;
  reason?: string;
  recommended?: boolean;
}

export interface DatasetInfo {
  dataset_id: number;
  dataset_name: string;
  source?: string;
  reason?: string;
  data_layer?: string;
  tile_url: string;
  context_layer?: string | null;
  context_layers?: DatasetContextLayer[];
  parameters?: DatasetParameter[] | null;
  start_date?: string;
  end_date?: string;
  threshold?: number | null;
  description?: string;
  methodology?: string;
  cautions?: string;
  citation?: string;
  cadence?: string;
  resolution?: string;
  geographic_coverage?: string;
  provider?: string;
  [key: string]: unknown; // Allow other properties
}

// LangChain content structure (for internal API use)
export interface LangChainContent {
  text?: string;
  [key: string]: unknown; // Allow other properties
}

export interface LangChainResponse {
  node: string;
  timestamp: string;
  update: string;
}

// LangChain-based API response structure (for internal API use)
export interface LangChainUpdate {
  dataset: object;
  suggested_datasets?: SuggestedDataset[];
  aoi?: object;
  aoi_selection?: AOISelection;
  imagery?: ImageryInfo;
  start_date?: string;
  end_date?: string;
  insights: object[];
  charts_data: object[];
  // Optional provenance fields emitted by tools
  codeact_parts?: CodeActPart[];
  source_urls?: string[];
  insight_count: number;
  messages: [
    {
      lc: number;
      type: string;
      id: string[];
      kwargs: {
        content: LangChainContent | unknown;
        response_metadata: Record<string, unknown>;
        type: string;
        id: string;
        usage_metadata: Record<string, unknown>;
        tool_calls: unknown[];
        invalid_tool_calls: unknown[];
        name?: string;
        status?: string; // For tool error detection
      };
    },
  ];
}

export type QueryType = "query" | "human_input";
