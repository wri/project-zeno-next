import { FeatureCollection } from "geojson";
import type { BlogArticle } from "@/app/schemas/api/blogs/get";
import type { ChartColorFields } from "@/app/types/chartColors";

export type { BlogArticle };

// A read-only snapshot of the context at the moment a user message was sent:
// the area(s), dataset(s) and date range that were active. Rendered as static
// chips under the user message (no add/remove interaction). This is the *full*
// active context at send time — not the deduplicated `ui_context` delta.
export interface MessageContext {
  areas?: string[];
  datasets?: string[];
  daterange?: { start_date: string; end_date: string };
}

// Type for storing tool execution data
export interface ToolStepData {
  name: string;
  /** Set when the tool result was error-classified (recoverable failure or
   * agent guidance) so the reasoning timeline can mark the step. */
  status?: "error";
  content?: string;
  dataset?: object;
  insights?: object[];
  charts_data?: object[];
  codeact_parts?: CodeActPart[];
  source_urls?: string[];
  cited_articles?: BlogArticle[];
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
    | "dashboard-card"
    | "error"
    | "warning"
    | "nudge"
    | "analyse-nudge"
    | "view-analysis-nudge"
    | "create-dashboard-nudge"
    | "stopped";
  message: string;
  timestamp: string;
  widgets?: InsightWidget[]; // For widget messages
  aoiSelection?: AOISelection; // For area-card messages
  dashboardId?: string; // For dashboard-card messages
  dashboardName?: string; // For dashboard-card messages; absent on threads that predate the backend streaming it
  nudge?: Nudge; // For nudge messages
  analyseSuggestion?: AnalyseSuggestion; // For analyse-nudge messages
  context?: MessageContext; // Read-only context snapshot for user messages
  viewAnalysisSuggestion?: ViewAnalysisSuggestion; // For view-analysis-nudge messages
  createDashboardSuggestion?: CreateDashboardSuggestion; // For create-dashboard-nudge messages
  traceId?: string;
  toolSteps?: ToolStepData[]; // For user messages - reasoning steps taken to respond
  reasoningDuration?: number; // Duration in seconds for reasoning to complete
  suppressFooter?: boolean; // Non-terminal segment of a [Chart uuid] split — no footer, tight spacing
}

// Widget types for insights. Extends ChartColorFields with the backend color
// registry's resolution for this chart (absent for pre-migration insights).
export interface InsightWidget extends ChartColorFields {
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
    | "scatter"
    | "hierarchical-bar";
  title: string;
  description: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
  seriesFields?: string[];
  datasetName?: string;
  generation?: InsightGeneration; // Optional provenance for how the widget was generated
  // Whether this insight is curated/verified rather than AI-generated. Set from
  // InsightRecord.verification when a widget is built from stored insights; when
  // undefined, the workspace falls back to treating a missing `generation` (the
  // direct/curated flow) as curated.
  curated?: boolean;
  analysisParams?: AnalysisParams; // Parameters used by the agent to produce this insight
  // Persisted insight UUID (streamed with generate_insights). All charts of
  // one analysis share it; it is the handle for REST widget adds
  // (POST /api/dashboards/:id/widgets).
  insightId?: string;
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
  ff?: string;
}

// Simplified message that our API sends to the client
export interface StreamMessage {
  type: "text" | "tool" | "other" | "error" | "human";
  text?: string;
  tool?: Record<string, unknown>;
  name?: string;
  content?: string;
  dataset?: object;
  nudge?: Nudge;
  aoi?: object;
  aoi_selection?: AOISelection;
  imagery?: ImageryInfo;
  insights?: object[];
  charts_data?: object[];
  codeact_parts?: CodeActPart[];
  source_urls?: string[];
  cited_articles?: BlogArticle[];
  insight_count?: number;
  // Persisted insight UUID riding on generate_insights (and recall/restyle)
  // state updates — the handle for adding the analysis to a dashboard.
  insight_id?: string;
  // Names of the tools an AI message is about to call. The agent announces a
  // tool call before its result streams back, so this is the earliest signal
  // that e.g. an insight is being generated.
  tool_calls?: string[];
  timestamp: string;
  start_date?: string;
  end_date?: string;
  trace_id?: string;
  // Backend write signal carried in a tool message's response_metadata
  // (e.g. "dashboard_updated" after create_dashboard / add_to_dashboard) —
  // tells the client to refetch the named resource.
  msg_type?: string;
  dashboard_id?: string;
  dashboard_name?: string;
}

// Sentinel-2 mosaic payload written to agent state by the show_imagery tool.
// tile_url / tilejson_url are absolute URLs to the tiler the backend is
// configured to use (currently the public GFW tiles service). mosaic_id is an
// opaque recipe token, stable across reruns of the same request.
export interface ImageryInfo {
  tile_url: string;
  tilejson_url: string;
  mosaic_id: string;
  // Scene count and acquired date range; optional because payloads written
  // before wri/project-zeno#758 omitted them on mosaic cache hits.
  item_count?: number;
  date_start?: string;
  date_end?: string;
  // Observed cloud-cover stats across the mosaic's scenes (%), added by
  // wri/project-zeno#758 — absent on older payloads.
  mean_cloud_cover?: number;
  min_cloud_cover?: number;
  max_cloud_cover_observed?: number;
  target_date: string;
  aoi_names: string[];
  // Search constraints used to build the mosaic. Absent on payloads created
  // before these fields existed (replayed old threads).
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
  source_layer?: string | null; // present => render as MVT vector
  type?: "raster" | "vector"; // optional explicit override from backend
}

export interface DatasetParameter {
  name: string;
  values: unknown[];
}

// Payload of an analyse-nudge message: a snapshot of the area + dataset the
// CTA was created for, taken at injection time so the card stays stable even
// if the live context changes afterwards.
export interface AnalyseSuggestion {
  areaName: string;
  datasetId: number;
  datasetName: string;
  // Set once the user clicks Analyse: accepted nudges persist in the thread
  // as a record of the run, while pending ones are replaced by new selections.
  accepted?: boolean;
}

// Payload of a view-analysis-nudge message: a snapshot of the area, dataset and
// date window the direct analysis should run against, taken at injection time so
// the card stays stable even if the live selection/context changes afterwards.
// The `area` shape mirrors the analysis feature's AreaSelection structurally
// (inlined here to avoid an app→feature import).
export interface ViewAnalysisSuggestion {
  area: {
    name: string;
    source: string;
    srcId?: string;
    subtype?: string;
  };
  datasetId: number;
  datasetName: string;
  /** ISO date string "yyyy-MM-dd" */
  startDate: string;
  /** ISO date string "yyyy-MM-dd" */
  endDate: string;
  // Set once the user clicks View Analysis: accepted nudges persist in the
  // thread as a record of the run, while pending ones are replaced by new ones.
  accepted?: boolean;
}

// Payload of a create-dashboard-nudge message: the AOI identity snapshotted at
// injection time, plus the analysis inputs used to seed the new dashboard.
//
// No `accepted` flag, unlike its analyse/view-analysis siblings: once the
// dashboard exists the card relabels itself to "Open …" off the dashboards
// query, so acceptance is derivable rather than stored.
export interface CreateDashboardSuggestion {
  areaName: string;
  // POST /api/dashboards requires all three, so the nudge is only surfaced
  // when the clicked feature resolved an id and a subtype.
  source: string;
  srcId: string;
  subtype: string;
  // The active dataset and window, used to attach a first insight to the new
  // dashboard. Optional because the AOI menu can create without a dataset —
  // that dashboard opens as an empty grid (PZB-1119).
  datasetId?: number;
  datasetName?: string;
  /** ISO date string "yyyy-MM-dd" */
  startDate?: string;
  /** ISO date string "yyyy-MM-dd" */
  endDate?: string;
}

// A question the agent asks the user, rendered as a row of clickable options
// under the accompanying assistant message. Clicking an option submits that
// exact string as the user's next chat message ("human_input") — there is no
// separate resolve endpoint.
export interface Nudge {
  // Free-form label, not an enum. Known values: "dataset_choice",
  // "aoi_choice", "dashboard_choice", "insight_choice" — plus arbitrary
  // ad-hoc values from send_nudge ("confirm", "clarify", …). Unknown types
  // render as plain option buttons.
  type: string;
  // Each string is BOTH the button label AND the exact text resubmitted as
  // the user's next chat message on click.
  options: string[];
  // Optional structured payloads, same order/length as options. Only present
  // for dataset_choice (SuggestedDataset entries) and aoi_choice (resolved
  // AOI entries). Never assume alignment with options — validate per entry.
  data?: Array<Record<string, unknown>>;
}

// Shape of a dataset_choice nudge `data` entry. Options arrive ranked;
// treat index 0 as recommended.
export interface SuggestedDataset {
  dataset_id: number;
  dataset_name: string;
  context_layer?: string | null;
  parameters?: DatasetParameter[] | null;
  start_date?: string;
  end_date?: string;
  reason?: string;
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
  nudge?: Nudge;
  // Legacy state field replaced by `nudge` (wri/project-zeno#770). Kept
  // because threads created before the migration permanently contain
  // suggested_datasets in their stored stream lines, which fetchThread
  // replays — see the parser fallback in parse-stream-message.ts.
  suggested_datasets?: (SuggestedDataset & { recommended?: boolean })[];
  aoi?: object;
  aoi_selection?: AOISelection;
  imagery?: ImageryInfo;
  start_date?: string;
  end_date?: string;
  insights: object[];
  charts_data: object[];
  insight_id?: string;
  // Optional provenance fields emitted by tools
  codeact_parts?: CodeActPart[];
  source_urls?: string[];
  cited_articles?: BlogArticle[];
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
