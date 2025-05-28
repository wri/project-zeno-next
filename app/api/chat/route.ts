import { NextRequest, NextResponse } from 'next/server';
import { ChatAPIRequest, ChatAPIResponse, LangChainResponse } from '@/app/types/chat';

export async function POST(request: NextRequest) {
  try {
    const body: ChatAPIRequest = await request.json();
    const { query, query_type, thread_id } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (!query_type || typeof query_type !== 'string') {
      return NextResponse.json(
        { error: 'Query type is required and must be a string' },
        { status: 400 }
      );
    }

    if (!thread_id || typeof thread_id !== 'string') {
      return NextResponse.json(
        { error: 'Thread ID is required and must be a string' },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.zeno-staging.ds.io/zeno/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        query_type,
        thread_id
      }),
    });
    
    console.log('External API response status:', response.status);

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data: LangChainResponse = await response.json();
    console.log('External API response data:', data);

    // Extract the actual response content from the LangChain response structure
    const responseContent = data?.update?.kwargs?.content || 'No response received from the assistant.';

    const apiResponse: ChatAPIResponse = {
      response: responseContent,
      thread_id: data?.update?.kwargs?.id || thread_id
    };

    return NextResponse.json(apiResponse);
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 