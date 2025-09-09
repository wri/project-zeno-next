import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

import {
  ChatMessage,
  ChatPrompt,
  StreamMessage,
  QueryType,
  UiContext,
} from "@/app/types/chat";
import useContextStore from "./contextStore";
import { readDataStream } from "../api/shared/read-data-stream";
import { DATASET_BY_ID } from "../constants/datasets";
import { generateInsightsTool } from "./chat-tools/generateInsights";
import { pickAoiTool } from "./chat-tools/pickAoi";
import { pickDatasetTool } from "./chat-tools/pickDataset";
import { pullDataTool } from "./chat-tools/pullData";
import useSidebarStore from "./sidebarStore";
import {
  showApiError,
  showError,
  showServiceUnavailableError,
} from "@/app/hooks/useErrorHandler";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentThreadId: string | null;
  toolSteps: string[];
}

interface ChatActions {
  reset: () => void;
  addMessage: (
    message: Omit<ChatMessage, "id" | "timestamp"> & { timestamp?: string }
  ) => void;
  sendMessage: (message: string, queryType?: QueryType) => Promise<void>;
  setLoading: (loading: boolean) => void;
  generateNewThread: () => string;
  fetchThread: (
    threadId: string,
    abortController?: AbortController
  ) => Promise<void>;
  addToolStep: (toolName: string) => void;
  clearToolSteps: () => void;
}

const initialState: ChatState = {
  messages: [
    {
      id: "1",
      type: "system",
      message: `Hi, I'm your Global Nature Watch assistant.
I help you explore how our planet's land and ecosystems are changing, powered by trusted, open-source data from Land & Carbon Lab and Global Forest Watch.

Ask a question and let's see what we can do for nature.`,
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,
  currentThreadId: null,
  toolSteps: [],
};

// Helper function to process stream messages and add them to chat
async function processStreamMessage(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void,
  addToolStep: (toolName: string) => void
) {
  if (streamMessage.type === "error") {
    // Handle timeout errors specifically
    if (streamMessage.name === "timeout") {
      addMessage({
        type: "error",
        message:
          streamMessage.content || "Request timed out. Please try again.",
        timestamp: streamMessage.timestamp,
      });
      showApiError(
        streamMessage.content || "Request timed out. Please try again.",
        { title: "Request Timed Out" }
      );
    } else {
      // Handle other error messages from LangChain tools
      addMessage({
        type: "error",
        message:
          "I encountered an error while processing your request. Please try rephrasing your question or try again.",
        timestamp: streamMessage.timestamp,
      });
      showError(
        "I encountered an error while processing your request. Please try rephrasing your question or try again.",
        { title: "Processing Error" }
      );
    }
  } else if (streamMessage.type === "text" && streamMessage.text) {
    addMessage({
      type: "assistant",
      message: streamMessage.text,
      timestamp: streamMessage.timestamp,
    });
  } else if (streamMessage.type === "tool") {
    // Add tool step to reasoning display
    if (streamMessage.name) {
      addToolStep(streamMessage.name);
    }

    // Special handling for generate_insights tool
    if (streamMessage.name === "generate_insights" && streamMessage.insights) {
      return generateInsightsTool(streamMessage, addMessage);
    }
    // Special handling for pick-aoi tool (previously location-tool)
    else if (streamMessage.name === "pick-aoi" && streamMessage.aoi) {
      return await pickAoiTool(streamMessage, addMessage);
    }
    // Handling for pick-dataset tool
    else if (streamMessage.name === "pick-dataset") {
      return pickDatasetTool(streamMessage, addMessage);
    }
    // Handling for pull-data tool
    else if (streamMessage.name === "pull-data") {
      return pullDataTool(streamMessage, addMessage);
    }
  }
}

const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
      timestamp: message.timestamp || new Date().toISOString(),
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
    const {
      addMessage,
      setLoading,
      currentThreadId,
      generateNewThread,
      addToolStep,
      clearToolSteps,
    } = get();
    const { context } = useContextStore.getState();

    // Generate thread ID if this is the first message
    const threadId = currentThreadId || generateNewThread();

    // Add user message
    addMessage({
      type: "user",
      message,
      context,
    });

    // Clear any previous tool steps and start loading
    clearToolSteps();
    setLoading(true);

    // Build ui_context from current context

    const ui_context: UiContext = {};

    // Find area context and convert to aoi_selected format
    const areaContext = context.find(
      (ctx) => ctx.contextType === "area" && ctx.aoiData
    );
    if (areaContext && areaContext.aoiData) {
      ui_context.aoi_selected = {
        aoi: {
          name: areaContext.aoiData.name,
          gadm_id: areaContext.aoiData.gadm_id,
          src_id: areaContext.aoiData.src_id,
          subtype: areaContext.aoiData.subtype,
          source: areaContext.aoiData.source,
        },
        aoi_name: areaContext.aoiData.name,
        subregion_aois: null,
        subregion: null,
        subtype: areaContext.aoiData.subtype,
      };
    }

    const dateContext = context.find((ctx) => ctx.contextType === "date");
    if (dateContext && dateContext.dateRange) {
      ui_context.daterange_selected = {
        start_date: format(dateContext.dateRange.start, "yyyy-MM-dd"),
        end_date: format(dateContext.dateRange.end, "yyyy-MM-dd"),
      };
    }

    const datasetContext = context.find((ctx) => ctx.contextType === "layer");
    if (datasetContext && typeof datasetContext.datasetId === "number") {
      const ds = DATASET_BY_ID[datasetContext.datasetId];
      if (ds) ui_context.dataset_selected = { dataset: ds };
    }

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
        body: JSON.stringify({
          ...prompt,
          ...(Object.keys(ui_context).length > 0 && { ui_context }),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = new Error("Failed to send message");
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();

      await readDataStream({
        abortController,
        reader,
        onData: async (data, isFinal) => {
          // Log the raw data received
          console.log("API Stream message:", data);
          try {
            const streamMessage: StreamMessage = JSON.parse(data);
            await processStreamMessage(streamMessage, addMessage, addToolStep);
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
        showApiError(
          "The request timed out on the client side. This might be due to a complex query or server load. Please try again or rephrase your question.",
          { title: "Client Timeout" }
        );
      } else if (
        error instanceof TypeError &&
        error.message.includes("network")
      ) {
        addMessage({
          type: "error",
          message:
            "Unable to connect to the server. Please check your internet connection and try again.",
        });
        showApiError(
          "Unable to connect to the server. Please check your internet connection and try again.",
          { title: "Network Error" }
        );
      } else if (
        error instanceof Error &&
        error.message.includes("Failed to fetch")
      ) {
        addMessage({
          type: "error",
          message:
            "Network request failed. Please check your connection and try again.",
        });
        showApiError("Network request failed. Please try again.", {
          title: "Network Request Failed",
        });
      } else if (
        error instanceof Error &&
        (error as Error & { status?: number }).status &&
        (error as Error & { status?: number }).status! >= 400 &&
        (error as Error & { status?: number }).status! < 500
      ) {
        addMessage({
          type: "error",
          message:
            "The service is currently unavailable. Please try again later.",
        });
        showServiceUnavailableError();
      } else {
        addMessage({
          type: "error",
          message:
            "Sorry, there was an error processing your request. Please try again.",
        });
        showError(
          "Sorry, there was an error processing your request. Please try again."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      if (!currentThreadId) {
        // Change the url using the history API so not to trigger any next
        // router events.
        window.history.replaceState(null, "", `/app/threads/${threadId}`);
      }
      useSidebarStore.getState().fetchThreads(); // Refresh threads in sidebar
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  addToolStep: (toolName: string) => {
    set((state) => ({
      toolSteps: [...state.toolSteps, toolName],
    }));
  },

  clearToolSteps: () => set({ toolSteps: [] }),

  fetchThread: async (threadId: string, abort?: AbortController) => {
    const { setLoading, addMessage, addToolStep, clearToolSteps } = get();
    const { upsertContextByType } = useContextStore.getState();

    // Clear any previous tool steps and start loading
    clearToolSteps();
    setLoading(true);
    // Set up abort controller for client-side timeout
    const abortController = abort || new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(
        "CLIENT TIMEOUT: Request exceeded 5 minutes 10 seconds - aborting request"
      );
      abortController.abort();
    }, 310000); // 5 minutes 10 seconds (slightly longer than server timeout)

    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = new Error("Failed to fetch thread");
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();

      await readDataStream({
        abortController,
        reader,
        onData: async (data, isFinal) => {
          try {
            const streamMessage: StreamMessage = JSON.parse(data);

            if (streamMessage.type === "human") {
              if (streamMessage.aoi) {
                const aoi = streamMessage.aoi as {
                  name: string;
                  gadm_id: string;
                  src_id: string;
                  subtype: string;
                };
                upsertContextByType({
                  contextType: "area",
                  content: aoi.name,
                  aoiData: aoi,
                });
                await pickAoiTool(streamMessage, addMessage);
              }

              if (streamMessage.start_date && streamMessage.end_date) {
                upsertContextByType({
                  contextType: "date",
                  content: `${streamMessage.start_date} — ${streamMessage.end_date}`,
                  dateRange: {
                    start: new Date(streamMessage.start_date),
                    end: new Date(streamMessage.end_date),
                  },
                });
              }

              // Add user message
              addMessage({
                type: "user",
                message: streamMessage.text!,
                // The context will have been updated by the upsertContextByType
                // calls above. Get the updated context from the store
                context: useContextStore.getState().context,
                timestamp: streamMessage.timestamp,
              });

              return;
            }
            console.log("🚀 ~ fetchThread: ~ streamMessage:", streamMessage);
            await processStreamMessage(streamMessage, addMessage, addToolStep);
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
      if (abortController.signal.aborted) {
        console.log("FRONTEND: Stream ended due to abort signal");
      } else {
        console.error("Error sending message:", error);
        const status = (error as Error & { status?: number }).status;
        if (status && status >= 500) {
          showApiError("Server error while loading thread.", {
            title: "Server Error",
          });
        } else if (status && status >= 400 && status < 500) {
          showApiError("Unable to load thread.", {
            title: "Request Error",
          });
        } else if (
          error instanceof TypeError &&
          error.message.toLowerCase().includes("network")
        ) {
          showApiError("Network error. Please check your connection.", {
            title: "Network Error",
          });
        } else {
          showError("Unexpected error while loading thread.");
        }
      }
    } finally {
      set({ currentThreadId: threadId });
      clearTimeout(timeoutId);
      setLoading(false);
    }
  },
}));

export default useChatStore;
