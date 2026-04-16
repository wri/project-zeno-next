import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

import JSON5 from "json5";
import {
  ChatMessage,
  ChatPrompt,
  LangChainResponse,
  LangChainUpdate,
  StreamMessage,
  QueryType,
  UiContext,
  ToolStepData,
} from "@/app/types/chat";
import useContextStore from "./contextStore";
import { readDataStream } from "@/app/lib/read-data-stream";
import { parseStreamMessage } from "@/app/lib/parse-stream-message";
import { apiFetch } from "@/app/lib/api-client";
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
  toolSteps: ToolStepData[];
  pendingTraceId: string | null;
  reasoningStartTime: number | null; // Timestamp when reasoning started
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
  addToolStep: (toolData: StreamMessage) => void;
  clearToolSteps: () => void;
  attachToolStepsToLastUserMessage: (durationOverride?: number) => void;
}

const initialState: ChatState = {
  messages: [
    {
      id: "1",
      type: "system",
      message:
      `**Welcome to Global Nature Watch!**
      &nbsp;
      Hi, I'm your nature monitoring assistant, powered by AI and open data from [Global Forest Watch](https://globalforestwatch.org) and [Land & Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      You can ask me about land cover change, forest loss, or biodiversity risks in places you care about. For more details on how to get started, check out the [Help Center](https://help.globalnaturewatch.org/get-started).`,
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,
  currentThreadId: null,
  toolSteps: [],
  pendingTraceId: null,
  reasoningStartTime: null,
};

/**
 * Parses a raw NDJSON line from the FastAPI LangChain stream into a
 * simplified StreamMessage. Returns null for unhandled / unrecognised lines.
 */
function parseLangChainLine(rawLine: string): StreamMessage | null {
  const langChainMessage: LangChainResponse = JSON.parse(rawLine);
  const updateObject = JSON5.parse(langChainMessage.update) as LangChainUpdate &
    Record<string, unknown>;
  const date = langChainMessage.timestamp
    ? new Date(langChainMessage.timestamp)
    : new Date();

  // Upstream emits trace metadata as a standalone update with no messages array
  if (updateObject.trace_id) {
    return {
      type: "other",
      name: "trace",
      timestamp: date.toISOString(),
      trace_id: updateObject.trace_id as string,
      ...(updateObject.trace_url
        ? { content: updateObject.trace_url as string }
        : {}),
    } as StreamMessage;
  }

  const lastMessage = updateObject.messages?.at(-1);
  const rawType = lastMessage?.kwargs?.type as
    | "ai"
    | "tool"
    | "human"
    | undefined;
  const messageType = rawType
    ? ({ ai: "agent", tool: "tools", human: "human" }[rawType] as
        | "agent"
        | "tools"
        | "human")
    : undefined;

  if (!messageType) return null;

  return parseStreamMessage(updateObject, messageType, date);
}

// Helper function to process stream messages and add them to chat
async function processStreamMessage(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void,
  addToolStep: (toolData: StreamMessage) => void,
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
      addToolStep(streamMessage);
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
    else if (
      streamMessage.name === "pick_aoi" &&
      (streamMessage.aoi_selection || streamMessage.aoi)
    ) {
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
    set({ reasoningStartTime: Date.now() });
    setLoading(true);

    // Build ui_context from current context
    const newContext = context.filter((ctx) => !ctx.isAiContext);
    const ui_context: UiContext = {};

    // Find area context and convert to aoi_selected format
    // Supports both single-AOI (aoiData) and multi-AOI (aoiSelection)
    const areaContext = newContext.find(
      (ctx) => ctx.contextType === "area" && (ctx.aoiData || ctx.aoiSelection)
    );
    if (areaContext) {
      // Use aoiSelection's first AOI if available, otherwise fall back to aoiData
      const firstAoi = areaContext.aoiSelection?.aois?.[0];
      const aoiData = areaContext.aoiData;
      const aoi = firstAoi ?? aoiData;

      if (aoi) {
        ui_context.aoi_selected = {
          aoi: {
            name: aoi.name,
            gadm_id: aoiData?.gadm_id,
            src_id: aoi.src_id,
            subtype: aoi.subtype,
            source: aoi.source,
          },
          aoi_name: areaContext.aoiSelection?.name ?? aoi.name,
          subtype: aoi.subtype,
        };
      }
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
      const response = await apiFetch("/api/chat", {
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
          console.log("API Stream message:", data);
          try {
            const streamMessage = parseLangChainLine(data);
            if (!streamMessage) {
              console.log("Unhandled LangChain message:", data);
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
              console.error("Failed to parse final LangChain message", data, err);
            } else {
              console.error("Failed to parse LangChain message", data, err);
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
      
      // Attach tool steps to the user message before clearing loading state
      const { attachToolStepsToLastUserMessage } = get();
      attachToolStepsToLastUserMessage();
      
      setLoading(false);

      useSidebarStore.getState().fetchThreads(); // Refresh threads in sidebar
      return { isNew: !currentThreadId, id: threadId };
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  addToolStep: (toolData: StreamMessage) => {
    set((state) => ({
      toolSteps: [
        ...state.toolSteps,
        {
          name: toolData.name || "unknown",
          content: toolData.content,
          dataset: toolData.dataset,
          insights: toolData.insights,
          charts_data: toolData.charts_data,
          codeact_parts: toolData.codeact_parts,
          source_urls: toolData.source_urls,
          aoi: toolData.aoi,
          timestamp: toolData.timestamp,
        },
      ],
    }));
  },

  clearToolSteps: () => set({ toolSteps: [] }),

  attachToolStepsToLastUserMessage: (durationOverride?: number) => {
    set((state) => {
      if (state.toolSteps.length === 0) return state;

      // Find the last user message
      const messages = [...state.messages];
      let duration: number;

      if (durationOverride !== undefined) {
        duration = durationOverride;
      } else if (state.reasoningStartTime) {
        duration = (Date.now() - state.reasoningStartTime) / 1000;
      } else {
        duration = 0;
      }

      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === "user") {
          // Attach current tool steps and duration to this message
          messages[i] = {
            ...messages[i],
            toolSteps: [...state.toolSteps],
            reasoningDuration: duration,
          };
          break;
        }
      }
      return { messages, reasoningStartTime: null };
    });
  },

  fetchThread: async (threadId: string, abort?: AbortController) => {
    const { setLoading, addMessage, addToolStep, clearToolSteps } = get();
    const { upsertContextByType } = useContextStore.getState();

    // Clear any previous tool steps and start loading
    clearToolSteps();
    set({ reasoningStartTime: Date.now() });
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
      const response = await apiFetch(`/api/threads/${threadId}`, {
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
            const streamMessage = parseLangChainLine(data);
            if (!streamMessage) {
              console.log("Unhandled LangChain message:", data);
              return;
            }

            if (streamMessage.type === "human") {
              // Flush accumulated tool steps for the previous user message,
              // computing duration from the tool steps' own timestamps
              const currentToolSteps = get().toolSteps;
              if (currentToolSteps.length > 0) {
                const first = new Date(currentToolSteps[0].timestamp).getTime();
                const last = new Date(currentToolSteps[currentToolSteps.length - 1].timestamp).getTime();
                const historicalDuration = isNaN(first) || isNaN(last) ? 0 : (last - first) / 1000;
                get().attachToolStepsToLastUserMessage(historicalDuration);
                get().clearToolSteps();
              }

              if (streamMessage.aoi_selection || streamMessage.aoi) {
                // pickAoiTool handles context upsert with aoiSelection,
                // so we just call it and let it set context properly
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
              console.error("Failed to parse final LangChain message", data, err);
            } else {
              console.error("Failed to parse LangChain message", data, err);
            }
          }
        },
      });

      const { done: readerDone } = await reader.read();
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

      // Flush any remaining tool steps for the last user message
      const finalToolSteps = get().toolSteps;
      if (finalToolSteps.length > 0) {
        const first = new Date(finalToolSteps[0].timestamp).getTime();
        const last = new Date(finalToolSteps[finalToolSteps.length - 1].timestamp).getTime();
        const historicalDuration = isNaN(first) || isNaN(last) ? 0 : (last - first) / 1000;
        get().attachToolStepsToLastUserMessage(historicalDuration);
      }

      setLoading(false);
    }
  },
}));

export default useChatStore;
