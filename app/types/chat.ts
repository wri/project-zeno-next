import { ContextItem } from "../store/contextStore";
import { FeatureCollection } from "geojson";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system" | "widget" | "error";
  message: string;
  timestamp: string;
  widgets?: InsightWidget[]; // For widget messages
  context?: ContextItem[];
}

// Widget types for insights
export interface InsightWidget {
  type: "line" | "bar" | "table" | "dataset-card";
  title: string;
  description: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
}

// Raw insight data from API (before conversion to InsightWidget)
export interface RawInsightData {
  type: string;
  title: string;
  description: string;
  data: unknown;
}

export interface ChatPrompt {
  query: string;
  query_type: string;
  thread_id: string;
}

export interface ChatAPIRequest {
  query: string;
  query_type: string;
  thread_id: string;
}

// Simplified message that our API sends to the client
export interface StreamMessage {
  type: "text" | "tool" | "other" | "error" | "human";
  text?: string;
  tool?: Record<string, unknown>;
  name?: string;
  content?: string;
  dataset?: object;
  aoi?: object;
  insights?: object[];
  charts_data?: object[];
  insight_count?: number;
  timestamp: number;
}

export interface AOI {
  name: string;
  geometry: FeatureCollection;
}

export interface DatasetInfo {
  dataset_id: number;
  source: string;
  data_layer: string;
  tile_url: string;
  context_layer: string;
  threshold: number | null;
}

// LangChain content structure (for internal API use)
export interface LangChainContent {
  text?: string;
  [key: string]: unknown; // Allow other properties
}

export interface LangChainResponse {
  node: string;
  update: string;
}

// LangChain-based API response structure (for internal API use)
export interface LangChainUpdate {
  dataset: object;
  aoi: object;
  insights: object[];
  charts_data: object[];
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
    }
  ];
}

export type QueryType = "query" | "human_input";
