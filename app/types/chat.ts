import { ContextItem } from "../store/contextStore";

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
  type: "text" | "chart" | "table" | "timeseries";
  title: string;
  description: string;
  data: unknown;
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
  type: "text" | "tool" | "other" | "error";
  text?: string;
  tool?: Record<string, unknown>;
  other?: Record<string, unknown>;
  name?: string;
  content?: string;
  artifact?: unknown;
  timestamp: number;
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
        artifact?: unknown;
        name?: string;
        status?: string; // For tool error detection
      };
    }
  ];
}

export type QueryType = "query" | "human_input";
