export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: string;
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

// LangChain-based API response structure
export interface LangChainResponse {
  node: string;
  update: {
    lc: number;
    type: string;
    id: string[];
    kwargs: {
      content: string;
      response_metadata: any;
      type: string;
      id: string;
      usage_metadata: any;
      tool_calls: any[];
      invalid_tool_calls: any[];
    };
  };
}

export interface ChatAPIResponse {
  response: string;
  thread_id?: string;
  // Add other response fields as needed
}

export type QueryType = 'query' | 'human_input'; 