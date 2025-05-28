import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatPrompt, StreamMessage, QueryType } from '@/app/types/chat';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentThreadId: string | null;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (message: string, queryType?: QueryType) => Promise<void>;
  setLoading: (loading: boolean) => void;
  generateNewThread: () => string;
}

// Helper function to process stream messages and add them to chat
function processStreamMessage(
  streamMessage: StreamMessage, 
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
) {
  if (streamMessage.type === 'text' && streamMessage.text) {
    addMessage({
      type: 'assistant',
      message: streamMessage.text
    });
  } else if (streamMessage.type === 'artifact' && streamMessage.artifact) {
    // Handle tool/artifact messages with better formatting
    const artifactData = streamMessage.artifact;
    let artifactText = `Tool: ${artifactData.name || 'Unknown'}`;
    
    if (artifactData.content) {
      artifactText += `\nContent: ${typeof artifactData.content === 'string' ? artifactData.content : JSON.stringify(artifactData.content)}`;
    }
    
    if (artifactData.artifact) {
      artifactText += `\nData: ${JSON.stringify(artifactData.artifact)}`;
    }
    
    console.log('Artifact text:', artifactText);
    console.log('Artifact data:', artifactData);
    
    addMessage({
      type: 'assistant',
      message: artifactText
    });
  } else if (streamMessage.type === 'tool_call' && streamMessage.tool_calls) {
    addMessage({
      type: 'assistant',
      message: `Tool calls: ${JSON.stringify(streamMessage.tool_calls)}`
    });
  }
}

const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: '1',
      type: 'system',
      message: "Hi! I'm Land & Carbon Lab's alert explorer. I can help you find and investigate disturbances in your area of interest using the Land Disturbance Alert Classification System and other contextual data. \nStart by asking me what I can do.",
      timestamp: new Date().toISOString()
    }
  ],
  isLoading: false,
  currentThreadId: null,
  
  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage]
    }));
  },
  
  generateNewThread: () => {
    const threadId = uuidv4();
    set({ currentThreadId: threadId });
    return threadId;
  },
  
  sendMessage: async (message: string, queryType: QueryType = "query") => {
    const { addMessage, setLoading, currentThreadId, generateNewThread } = get();
    
    // Generate thread ID if this is the first message
    const threadId = currentThreadId || generateNewThread();
    
    // Add user message
    addMessage({
      type: 'user',
      message
    });
    
    setLoading(true);

    const prompt: ChatPrompt = {
      query: message,
      query_type: queryType,
      thread_id: threadId
    };
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Process the simplified streaming response
      const utf8Decoder = new TextDecoder("utf-8");
      const reader = response.body.getReader();
      let { value: chunk, done: readerDone } = await reader.read();
      let decodedChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";

      let buffer = ""; // Accumulate partial chunks

      while (!readerDone) {
        buffer += decodedChunk; // Append current chunk to buffer

        let lineBreakIndex;
        while ((lineBreakIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, lineBreakIndex).trim(); // Extract the line
          buffer = buffer.slice(lineBreakIndex + 1); // Remove processed line

          if (line) {
            try {
              const streamMessage: StreamMessage = JSON.parse(line);
              console.log('Received simplified message:', streamMessage);
              
              processStreamMessage(streamMessage, addMessage);
              
            } catch (err) {
              console.error("Failed to parse simplified message", line, err);
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
          const streamMessage: StreamMessage = JSON.parse(buffer);
          console.log('Final simplified message:', streamMessage);
          
          processStreamMessage(streamMessage, addMessage);
        } catch (err) {
          console.error("Failed to parse final simplified message", buffer, err);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        type: 'assistant',
        message: 'Sorry, there was an error processing your request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  },
  
  setLoading: (loading) => set({ isLoading: loading })
}));

export default useChatStore; 