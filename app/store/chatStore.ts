import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  ChatMessage,
  ChatPrompt,
  StreamMessage,
  QueryType,
} from "@/app/types/chat";
import useContextStore from "./contextStore";
import { readDataStream } from "../api/chat/read-data-stream";
import { generateInsightsTool } from "./chat-tools/generateInsights";
import { pickAoiTool } from "./chat-tools/pickAoi";
import { pickDatasetTool } from "./chat-tools/pickDataset";
import { pullDataTool } from "./chat-tools/pullData";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentThreadId: string | null;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  sendMessage: (message: string, queryType?: QueryType) => Promise<void>;
  setLoading: (loading: boolean) => void;
  generateNewThread: () => string;
}

// Helper function to process stream messages and add them to chat
function processStreamMessage(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {
  if (streamMessage.type === "error") {
    // Handle timeout errors specifically
    if (streamMessage.name === "timeout") {
      addMessage({
        type: "error",
        message:
          streamMessage.content || "Request timed out. Please try again.",
      });
    } else {
      // Handle other error messages from LangChain tools
      addMessage({
        type: "error",
        message:
          "I encountered an error while processing your request. Please try rephrasing your question or try again.",
      });
    }
  } else if (streamMessage.type === "text" && streamMessage.text) {
    addMessage({
      type: "assistant",
      message: streamMessage.text,
    });
  } else if (streamMessage.type === "tool") {
    // Special handling for generate-insights tool
    if (streamMessage.name === "generate-insights" && streamMessage.content) {
      return generateInsightsTool(streamMessage, addMessage);
    }
    // Special handling for pick-aoi tool (previously location-tool)
    else if (streamMessage.name === "pick-aoi" && streamMessage.aoi) {
      return pickAoiTool(streamMessage, addMessage);
    }
    // Handling for pick-dataset tool
    else if (streamMessage.name === "pick-dataset") {
      return pickDatasetTool(streamMessage, addMessage);
    }
    // Handling for pull-data tool
    else if (streamMessage.name === "pull-data") {
      return pullDataTool(streamMessage, addMessage);
    } else {
      addMessage({
        type: "assistant",
        message: `Tool: ${streamMessage.name || "Unknown"}`,
      });
    }
  }
}

const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: "1",
      type: "system",
      message:
        "Hi! I'm Land & Carbon Lab's alert explorer. I can help you find and investigate disturbances in your area of interest using the Land Disturbance Alert Classification System and other contextual data. \nStart by asking me what I can do.",
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,
  currentThreadId: null,

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  generateNewThread: () => {
    const threadId = uuidv4();
    set({ currentThreadId: threadId });
    return threadId;
  },

  sendMessage: async (message: string, queryType: QueryType = "query") => {
    const { addMessage, setLoading, currentThreadId, generateNewThread } =
      get();
    const { context } = useContextStore.getState();

    // Generate thread ID if this is the first message
    const threadId = currentThreadId || generateNewThread();

    // Add user message
    addMessage({
      type: "user",
      message,
      context,
    });

    setLoading(true);

    const prompt: ChatPrompt = {
      query: message,
      query_type: queryType,
      thread_id: threadId,
    };

    // Set up abort controller for client-side timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(
        "CLIENT TIMEOUT: Request exceeded 5 minutes 10 seconds - aborting request"
      );
      abortController.abort();
    }, 310000); // 5 minutes 10 seconds (slightly longer than server timeout)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prompt),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();

      await readDataStream({
        abortController,
        reader,
        onData: (data, isFinal) => {
          try {
            const streamMessage: StreamMessage = JSON.parse(data);
            processStreamMessage(streamMessage, addMessage);
          } catch (err) {
            if (isFinal) {
              console.error(
                "Failed to parse final simplified message",
                data,
                err
              );
            } else {
              console.error("Failed to parse simplified message", data, err);
            }
          }
        },
      });

      const { done: readerDone } = await reader.read();
      // Log why the loop ended
      if (readerDone) {
        console.log("FRONTEND: Stream ended normally (readerDone = true)");
      } else if (abortController.signal.aborted) {
        console.log("FRONTEND: Stream ended due to abort signal");
      }
    } catch (error) {
      console.error("Error sending message:", error);

      // Check if error was due to abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        console.log("FRONTEND: Request aborted due to timeout");
        addMessage({
          type: "error",
          message:
            "The request timed out on the client side. This might be due to a complex query or server load. Please try again or rephrase your question.",
        });
      } else {
        addMessage({
          type: "assistant",
          message:
            "Sorry, there was an error processing your request. Please try again.",
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useChatStore;
