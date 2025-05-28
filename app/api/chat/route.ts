import { NextRequest, NextResponse } from 'next/server';
import { ChatAPIRequest, LangChainResponse, StreamMessage } from '@/app/types/chat';

// Function to parse LangChain message into simplified format
function parseStreamMessage(langChainMessage: LangChainResponse): StreamMessage | null {
  // Validate input structure
  if (!langChainMessage?.update?.kwargs) {
    return null;
  }
  
  const kwargs = langChainMessage.update.kwargs;
  const content = kwargs.content;
  const artifact = kwargs.artifact;
  const kwargsType = kwargs.type;
  
  if (kwargsType === 'tool') {
    // For tool messages, extract artifact and content
    return {
      type: 'artifact',
      artifact: {
        content: content,
        artifact: artifact,
        name: kwargs.name
      },
      timestamp: Date.now()
    };
  } else if (kwargsType === 'ai') {
    // For AI messages, handle different content formats
    let textContent = null;
    
    if (typeof content === 'string') {
      // Content is a direct string
      textContent = content;
    } else if (content && typeof content === 'object') {
      if (content.text) {
        // Content is an object with text property
        textContent = content.text;
      } else if (Array.isArray(content) && content.length > 0) {
        // Content is an array of objects
        if (content[0].text) {
          textContent = content[0].text;
        } else if (typeof content[0] === 'string') {
          textContent = content[0];
        }
      }
    }
    
    // Only return a message if we have valid text content
    if (textContent && typeof textContent === 'string' && textContent.trim()) {
      return {
        type: 'text',
        text: textContent.trim(),
        timestamp: Date.now()
      };
    }
  }
  
  // Return null if we couldn't parse the message
  return null;
}

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

    // Check if the response is streaming
    if (!response.body) {
      return NextResponse.json(
        { error: 'No response body received' },
        { status: 500 }
      );
    }

    // Create a streaming response that parses LangChain and sends simplified messages
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const utf8Decoder = new TextDecoder("utf-8");
        const encoder = new TextEncoder();
        const reader = response.body!.getReader();
        let { value: chunk, done: readerDone } = await reader.read();
        let decodedChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";

        let buffer = ""; // Accumulate partial chunks

        try {
          while (!readerDone) {
            buffer += decodedChunk; // Append current chunk to buffer

            let lineBreakIndex;
            while ((lineBreakIndex = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, lineBreakIndex).trim(); // Extract the line
              buffer = buffer.slice(lineBreakIndex + 1); // Remove processed line

              if (line) {
                try {
                  const langChainMessage: LangChainResponse = JSON.parse(line);
                  console.log('Raw LangChain message:', langChainMessage);
                  
                  // Parse LangChain response and extract useful information
                  const streamMessage = parseStreamMessage(langChainMessage);
                  
                  // Send simplified message to client if we have something useful
                  if (streamMessage) {
                    controller.enqueue(
                      encoder.encode(JSON.stringify(streamMessage) + '\n')
                    );
                  } else {
                    // Log unhandled content for debugging
                    const kwargs = langChainMessage.update?.kwargs;
                    console.log('Unhandled message type:', kwargs?.type, { 
                      content: kwargs?.content, 
                      artifact: kwargs?.artifact 
                    });
                  }
                  
                } catch (err) {
                  console.error("Failed to parse line", line, err);
                }
              }
            }

            // Read next chunk
            ({ value: chunk, done: readerDone } = await reader.read());
            decodedChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";
          }

          // Handle any remaining data in the buffer
          if (buffer.trim()) {
            try {
              const langChainMessage: LangChainResponse = JSON.parse(buffer);
              console.log('Final LangChain message:', langChainMessage);
              
              // Same parsing logic for final message
              const streamMessage = parseStreamMessage(langChainMessage);
              
              if (streamMessage) {
                controller.enqueue(
                  encoder.encode(JSON.stringify(streamMessage) + '\n')
                );
              }
              
            } catch (err) {
              console.error("Failed to parse final buffer", buffer, err);
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
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
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 