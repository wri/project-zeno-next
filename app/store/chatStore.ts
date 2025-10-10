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
import useAuthStore from "./authStore";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentThreadId: string | null;
  toolSteps: string[];
  pendingTraceId: string | null;
}

interface ChatActions {
  reset: () => void;
  addMessage: (
    message: Omit<ChatMessage, "id" | "timestamp"> & { timestamp?: string }
  ) => void;
  sendMessage: (
    message: string,
    queryType?: QueryType
  ) => Promise<{ isNew: boolean; id: string }>;
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
      message:
      `**Welcome to Global Nature Watch!**
      &nbsp;
      Hi, I'm your nature monitoring assistant, powered by AI and open data from [Global Forest Watch](https://globalforestwatch.org) and [Land and Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      You can ask me about land cover change, forest loss, or biodiversity risks in places you care about. For more details on how to get started, check out the [Help Center](https://help.globalnaturewatch.org/get-started).`,
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,
  currentThreadId: null,
  toolSteps: [],
  pendingTraceId: null,
};

// Helper function to process stream messages and add them to chat
async function processStreamMessage(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void,
  addToolStep: (toolName: string) => void,
  getPendingTraceId: () => string | null,
  setPendingTraceId: (traceId: string | null) => void,
  attachTraceToLastAssistant: (traceId: string) => boolean
) {
  // Capture standalone trace metadata sent as a separate stream message
  if (streamMessage.type === "other" && streamMessage.name === "trace") {
    if (streamMessage.trace_id) {
      // Try to attach to the latest assistant message without a trace first
      const attached = attachTraceToLastAssistant(streamMessage.trace_id);
      if (!attached) {
        // No assistant yet; remember for the next one
        setPendingTraceId(streamMessage.trace_id);
      }
    }
    return;
  }
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
    // TODO: StreamMessage.type "text" currently represents assistant messages.
    // Consider renaming server-emitted type to "assistant" and updating this
    // branch accordingly, keeping temporary backward compatibility for "text".
  } else if (streamMessage.type === "text" && streamMessage.text) {
    const pending = getPendingTraceId();
    const traceToUse = streamMessage.trace_id || pending || undefined;
    addMessage({
      type: "assistant",
      message: streamMessage.text,
      timestamp: streamMessage.timestamp,
      traceId: traceToUse,
    });
    // Clear pending trace id once used
    if (pending && pending === traceToUse) {
      setPendingTraceId(null);
    }
  } else if (streamMessage.type === "tool") {
    // Add tool step to reasoning display
    if (streamMessage.name) {
      addToolStep(streamMessage.name);
    }

    // Special handling for generate_insights tool
    if (streamMessage.name === "generate_insights" && streamMessage.insights) {
      // Non-blocking: do not await tool side-effects
      void Promise.resolve().then(() =>
        generateInsightsTool(streamMessage, addMessage)
      );
      return;
    }
    // Special handling for pick_aoi tool (previously location-tool)
    else if (streamMessage.name === "pick_aoi" && streamMessage.aoi) {
      // Non-blocking: geometry fetch can be slow; don't stall stream
      void Promise.resolve().then(() => pickAoiTool(streamMessage, addMessage));
      return;
    }
    // Handling for pick_dataset tool
    else if (streamMessage.name === "pick_dataset") {
      void Promise.resolve().then(() =>
        pickDatasetTool(streamMessage, addMessage)
      );
      return;
    }
    // Handling for pull_data tool
    else if (streamMessage.name === "pull_data") {
      void Promise.resolve().then(() =>
        pullDataTool(streamMessage, addMessage)
      );
      return;
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
    const { context, markAsAiContext } = useContextStore.getState();

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
    const newContext = context.filter((ctx) => !ctx.isAiContext);
    const ui_context: UiContext = {};

    // Find area context and convert to aoi_selected format
    const areaContext = newContext.find(
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

    const dateContext = newContext.find((ctx) => ctx.contextType === "date");
    if (dateContext && dateContext.dateRange) {
      ui_context.daterange_selected = {
        start_date: format(dateContext.dateRange.start, "yyyy-MM-dd"),
        end_date: format(dateContext.dateRange.end, "yyyy-MM-dd"),
      };
    }

    const datasetContext = newContext.find(
      (ctx) => ctx.contextType === "layer"
    );
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

      // Update prompt usage from response headers (case-insensitive)
      useAuthStore.getState().setUsageFromHeaders(response.headers);

      const reader = response.body.getReader();

      await readDataStream({
        abortController,
        reader,
        onData: async (data, isFinal) => {
          // Log the raw data received
          console.log("API Stream message:", data);
          try {
            const streamMessage: StreamMessage = JSON.parse(data);
            await processStreamMessage(
              streamMessage,
              addMessage,
              addToolStep,
              () => get().pendingTraceId,
              (traceId) => set({ pendingTraceId: traceId }),
              (traceId: string) => {
                let attached = false;
                set((state) => {
                  for (let i = state.messages.length - 1; i >= 0; i--) {
                    const m = state.messages[i];
                    if (m.type === "assistant" && !m.traceId) {
                      state.messages[i] = { ...m, traceId };
                      attached = true;
                      break;
                    }
                  }
                  return state;
                });
                return attached;
              }
            );
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
        // All good. Mark current context items as AI context to prevent them
        // being sent again in future messages
        markAsAiContext(context.map((c) => c.id));
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

      useSidebarStore.getState().fetchThreads(); // Refresh threads in sidebar
      return { isNew: !currentThreadId, id: threadId };
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
            await processStreamMessage(
              streamMessage,
              addMessage,
              addToolStep,
              () => get().pendingTraceId,
              (traceId) => set({ pendingTraceId: traceId }),
              (traceId: string) => {
                let attached = false;
                set((state) => {
                  for (let i = state.messages.length - 1; i >= 0; i--) {
                    const m = state.messages[i];
                    if (m.type === "assistant" && !m.traceId) {
                      state.messages[i] = { ...m, traceId };
                      attached = true;
                      break;
                    }
                  }
                  return state;
                });
                return attached;
              }
            );
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
