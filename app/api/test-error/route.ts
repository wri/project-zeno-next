import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const errorType = url.searchParams.get('type') || 'validation';
  
  let mockLangChainError;
  
  switch (errorType) {
    case 'validation':
      mockLangChainError = {
        node: 'tools',
        update: {
          lc: 1,
          type: 'constructor',
          id: ['langchain', 'schema', 'messages', 'ToolMessage'],
          kwargs: {
            content: 'Error: 1 validation error for InsightsResponse\n' +
              'insights.2.data\n' +
              "  Field required [type=missing, input_value={'type': 'chart', 'title'...umber of KBAs affected'}, input_type=dict]\n" +
              '    For further information visit https://errors.pydantic.dev/2.11/v/missing\n' +
              ' Please fix your mistakes.',
            type: 'tool',
            name: 'kba-insights-tool',
            id: '6abe441e-c8d8-4cfa-b824-f31592626fef',
            tool_call_id: 'toolu_01JmoV4NQQyxGeXyezCdapK2',
            status: 'error'
          }
        }
      };
      break;
      
    case 'timeout':
      mockLangChainError = {
        node: 'tools',
        update: {
          lc: 1,
          type: 'constructor',
          id: ['langchain', 'schema', 'messages', 'ToolMessage'],
          kwargs: {
            content: 'Error: Request timeout - The operation took too long to complete.',
            type: 'tool',
            name: 'location-tool',
            id: 'timeout-test-123',
            tool_call_id: 'toolu_timeout_test',
            status: 'error'
          }
        }
      };
      break;
      
    case 'permission':
      mockLangChainError = {
        node: 'tools',
        update: {
          lc: 1,
          type: 'constructor',
          id: ['langchain', 'schema', 'messages', 'ToolMessage'],
          kwargs: {
            content: 'Error: Permission denied - You do not have access to this resource.',
            type: 'tool',
            name: 'kba-data-tool',
            id: 'permission-test-456',
            tool_call_id: 'toolu_permission_test',
            status: 'error'
          }
        }
      };
      break;
      
    default:
      mockLangChainError = {
        node: 'tools',
        update: {
          lc: 1,
          type: 'constructor',
          id: ['langchain', 'schema', 'messages', 'ToolMessage'],
          kwargs: {
            content: 'Error: Unknown error occurred during processing.',
            type: 'tool',
            name: 'unknown-tool',
            id: 'unknown-error-789',
            tool_call_id: 'toolu_unknown_test',
            status: 'error'
          }
        }
      };
  }

  // Create a streaming response that sends the mock error
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // Send the mock error message
        controller.enqueue(
          encoder.encode(JSON.stringify(mockLangChainError) + '\n')
        );
        
        // Wait a bit to simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Optionally send a normal message after the error to test mixed scenarios
        const mockNormalMessage = {
          node: 'llm',
          update: {
            lc: 1,
            type: 'constructor',
            id: ['langchain', 'schema', 'messages', 'AIMessage'],
            kwargs: {
              content: `I'm still working. Let me try a different approach.`,
              type: 'ai',
              id: 'run-456',
              usage_metadata: {},
              tool_calls: [],
              invalid_tool_calls: []
            }
          }
        };
        
        controller.enqueue(
          encoder.encode(JSON.stringify(mockNormalMessage) + '\n')
        );
        
      } catch (error) {
        console.error('Mock streaming error:', error);
        controller.error(error);
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}