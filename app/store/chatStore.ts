import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatPrompt, ChatAPIResponse, QueryType } from '@/app/types/chat';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentThreadId: string | null;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (message: string, queryType?: QueryType) => Promise<void>;
  setLoading: (loading: boolean) => void;
  generateNewThread: () => string;
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
      id: Date.now().toString(),
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
      
      const data: ChatAPIResponse = await response.json();
      
      // Add assistant response
      addMessage({
        type: 'assistant',
        message: data.response || 'Sorry, I could not process your request.'
      });
      
      // Update thread ID if provided in response
      if (data.thread_id && data.thread_id !== threadId) {
        set({ currentThreadId: data.thread_id });
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