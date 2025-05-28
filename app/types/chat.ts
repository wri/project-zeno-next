export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'widget' | 'error';
  message: string;
  timestamp: string;
  widgets?: InsightWidget[]; // For widget messages
}

// Widget types for insights
export interface InsightWidget {
  type: 'text' | 'chart' | 'table' | 'timeseries';
  title: string;
  description: string;
  data: any;
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
  type: 'text' | 'tool' | 'other' | 'error';
  text?: string;
  tool?: any;
  other?: any;
  name?: string;
  content?: string;
  artifact?: any;
  timestamp: number;
}

// LangChain content structure (for internal API use)
export interface LangChainContent {
  text?: string;
  [key: string]: any; // Allow other properties
}

// LangChain-based API response structure (for internal API use)
export interface LangChainResponse {
  node: string;
  update: {
    lc: number;
    type: string;
    id: string[];
    kwargs: {
      content: LangChainContent | any;
      response_metadata: any;
      type: string;
      id: string;
      usage_metadata: any;
      tool_calls: any[];
      invalid_tool_calls: any[];
      artifact?: any;
      name?: string;
      status?: string; // For tool error detection
    };
  };
}

export type QueryType = 'query' | 'human_input'; 