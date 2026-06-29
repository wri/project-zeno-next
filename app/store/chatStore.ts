import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

import JSON5 from "json5";
import {
  ChatMessage,
  ChatPrompt,
  LangChainResponse,
  LangChainUpdate,
  StreamMessage,
  QueryType,
  ToolStepData,
  SuggestedDataset,
  AnalyseSuggestion,
} from "@/app/types/chat";
import useMapStore from "./mapStore";
import {
  deriveContext,
  diffUiContext,
  emptyContextKeys,
  type ContextKeys,
} from "@/app/utils/messageContext";
import { readDataStream } from "@/app/lib/read-data-stream";
import { parseStreamMessage } from "@/app/lib/parse-stream-message";
import { buildInsightChatMessages } from "@/app/lib/insight-chat-messages";
import { apiFetch } from "@/app/lib/api-client";
import { getToolErrorMessage } from "@/app/lib/tool-display";
import { generateInsightsTool } from "./chat-tools/generateInsights";
import { pickAoiTool } from "./chat-tools/pickAoi";
import { pickDatasetTool } from "./chat-tools/pickDataset";
import { pullDataTool } from "./chat-tools/pullData";
import { queryClient } from "@/app/lib/query-client";
import {
  showApiError,
  showError,
  showServiceUnavailableError,
} from "@/app/hooks/useErrorHandler";
import useAuthStore from "./authStore";
import useInsightStore from "./insightStore";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  // True only while the agent is actively generating an insight — i.e. between
  // the agent announcing a generate_insights tool call and that tool's result
  // arriving. Distinct from isLoading (true for the whole request) so the
  // insight workspace loading state surfaces only when an insight is on the way.
  isGeneratingInsight: boolean;
  abortController: AbortController | null;
  currentThreadId: string | null;
  toolSteps: ToolStepData[];
  pendingTraceId: string | null;
  reasoningStartTime: number | null; // Timestamp when reasoning started
  // The selected date range — the one query concern with no map/layer
  // counterpart, so it is owned here directly.
  dateRange: { start: Date; end: Date } | null;
  // Per-slot identity of the context last sent to the backend on this thread.
  // The `/api/chat` `ui_context` is non-idempotent, so each slot is sent only
  // when it changes. Reset per thread (cleared by reset(), seeded by
  // fetchThread, folded forward by the agent's own pick_aoi/pick_dataset).
  lastSentContext: ContextKeys;
}

interface ChatActions {
  reset: () => void;
  addMessage: (
    message: Omit<ChatMessage, "id" | "timestamp"> & { timestamp?: string }
  ) => void;
  upsertAnalyseNudge: (suggestion: AnalyseSuggestion) => void;
  acceptAnalyseNudge: (messageId: string) => void;
  sendMessage: (
    message: string,
    queryType?: QueryType
  ) => Promise<{ isNew: boolean; id: string }>;
  setLoading: (loading: boolean) => void;
  setGeneratingInsight: (generating: boolean) => void;
  generateNewThread: () => string;
  fetchThread: (
    threadId: string,
    abortController?: AbortController
  ) => Promise<void>;
  cancelRequest: () => void;
  addToolStep: (toolData: StreamMessage) => void;
  clearToolSteps: () => void;
  attachToolStepsToLastUserMessage: (durationOverride?: number) => void;
  setDateRange: (range: { start: Date; end: Date }) => void;
  clearDateRange: () => void;
  // Fold the agent's own picks into the last-sent context so they are never
  // echoed back to the backend on the next user message.
  foldSentContext: (partial: Partial<ContextKeys>) => void;
}

const initialState: ChatState = {
  messages: [
    {
      id: "1",
      type: "system",
      message: `**Welcome to Global Nature Watch!**

Hi, I'm your nature monitoring assistant, powered by AI and open data from [Global Forest Watch](https://globalforestwatch.org) and [Land & Carbon Lab](https://landcarbonlab.org).

You can ask me about land cover change, forest loss, or biodiversity risks in places you care about. For more details on how to get started, check out the [Help Center](https://help.globalnaturewatch.org/get-started).`,
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,
  isGeneratingInsight: false,
  abortController: null,
  currentThreadId: null,
  toolSteps: [],
  pendingTraceId: null,
  reasoningStartTime: null,
  dateRange: null,
  lastSentContext: emptyContextKeys(),
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
  attachTraceToLastAssistant: (traceId: string) => boolean,
  getPendingNudge: () => SuggestedDataset[] | null,
  setPendingNudge: (datasets: SuggestedDataset[] | null) => void,
  setGeneratingInsight: (generating: boolean) => void
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
  // A pure tool-call turn (AI message with no text). If the agent is about to
  // run generate_insights, flag it so the insight workspace can show its
  // loading state now — before the chart data arrives.
  if (streamMessage.type === "other" && streamMessage.name === "tool_calls") {
    if (streamMessage.tool_calls?.includes("generate_insights")) {
      setGeneratingInsight(true);
    }
    return;
  }
  if (streamMessage.type === "error") {
    // A generate_insights error means no chart is coming — clear the loading
    // state so the workspace skeleton doesn't linger while the agent recovers.
    if (streamMessage.name === "generate_insights") {
      setGeneratingInsight(false);
    }
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
      // No toast: the agent recovers with a follow-up assistant message,
      // so a toast would falsely suggest the chat itself is broken.
      addMessage({
        type: "warning",
        message: getToolErrorMessage(streamMessage.name),
        timestamp: streamMessage.timestamp,
      });
    }
    // TODO: StreamMessage.type "text" currently represents assistant messages.
    // Consider renaming server-emitted type to "assistant" and updating this
    // branch accordingly, keeping temporary backward compatibility for "text".
  } else if (streamMessage.type === "text" && streamMessage.text) {
    // The agent can narrate ("Let me analyse…") and call generate_insights in
    // the same turn — flag the pending insight so its loading state appears
    // while the chart is computed.
    if (streamMessage.tool_calls?.includes("generate_insights")) {
      setGeneratingInsight(true);
    }
    const pending = getPendingTraceId();
    const traceToUse = streamMessage.trace_id || pending || undefined;

    // Consume the most recent generate_insights batch and render it with the
    // assistant text. When the reply contains [Chart N] markers, cards are
    // placed positionally; otherwise (e.g. current staging, which emits chart
    // data but no markers) they are appended after the text. See
    // buildInsightChatMessages for the full contract.
    const pendingWidgets = useInsightStore.getState().consumePendingBatch();
    buildInsightChatMessages(
      streamMessage.text,
      pendingWidgets,
      streamMessage.timestamp,
      traceToUse
    ).forEach(addMessage);
    // Flush any buffered nudge immediately after the assistant message
    const pendingNudge = getPendingNudge();
    if (pendingNudge) {
      addMessage({
        type: "dataset-nudge",
        message: "",
        suggestedDatasets: pendingNudge,
        timestamp: streamMessage.timestamp,
      });
      setPendingNudge(null);
    }
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
      // Non-blocking: do not await tool side-effects. Clear the generating
      // flag in the same microtask that adds the insights, so the workspace
      // swaps skeleton → chart in a single render (no empty flash).
      void Promise.resolve().then(() => {
        generateInsightsTool(streamMessage, addMessage);
        setGeneratingInsight(false);
      });
      return;
    }
    // Special handling for pick_aoi tool (previously location-tool)
    else if (
      streamMessage.name === "pick_aoi" &&
      (streamMessage.aoi_selection || streamMessage.aoi)
    ) {
      // The agent picked this AOI itself — fold it into the last-sent context
      // so it isn't echoed back as a "new" selection on the next user message.
      const aoiName =
        streamMessage.aoi_selection?.name ??
        (streamMessage.aoi as { name?: string } | undefined)?.name;
      if (aoiName) useChatStore.getState().foldSentContext({ aoi: aoiName });
      // Non-blocking: geometry fetch can be slow; don't stall stream
      void Promise.resolve().then(() => pickAoiTool(streamMessage, addMessage));
      return;
    }
    // Handling for pick_dataset tool
    else if (streamMessage.name === "pick_dataset") {
      const datasetId = (
        streamMessage.dataset as { dataset_id?: number } | undefined
      )?.dataset_id;
      if (typeof datasetId === "number") {
        useChatStore.getState().foldSentContext({ dataset: datasetId });
      }
      void Promise.resolve().then(() =>
        pickDatasetTool(streamMessage, (message) => {
          // Buffer dataset-nudge messages so they appear after the assistant narrative
          if (message.type === "dataset-nudge" && message.suggestedDatasets) {
            setPendingNudge(message.suggestedDatasets);
          } else {
            addMessage(message);
          }
        })
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

  reset: () => {
    set(initialState);
    useInsightStore.getState().clearInsights();
  },

  setDateRange: (range) => set({ dateRange: range }),
  clearDateRange: () => set({ dateRange: null }),

  foldSentContext: (partial) =>
    set((state) => ({
      lastSentContext: { ...state.lastSentContext, ...partial },
    })),

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

  // The analyse nudge is client-side only (never replayed from thread
  // history): at most one is pending at a time, so a new selection replaces
  // any pending nudge instead of stacking. Accepted nudges persist in the
  // thread as a record of the analyses the user ran.
  upsertAnalyseNudge: (suggestion) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 11),
      type: "analyse-nudge",
      message: "",
      analyseSuggestion: suggestion,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      messages: [
        ...state.messages.filter(
          (m) => m.type !== "analyse-nudge" || m.analyseSuggestion?.accepted
        ),
        newMessage,
      ],
    }));
  },

  acceptAnalyseNudge: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId && m.analyseSuggestion
          ? {
              ...m,
              analyseSuggestion: { ...m.analyseSuggestion, accepted: true },
            }
          : m
      ),
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
      setGeneratingInsight,
      currentThreadId,
      generateNewThread,
      addToolStep,
      clearToolSteps,
    } = get();

    // Generate thread ID if this is the first message
    const threadId = currentThreadId || generateNewThread();

    // Derive the full active context from the map layers + selected date range.
    // The chip snapshot records the complete context; ui_context only carries
    // the slots that changed since the last send (the backend is non-idempotent).
    const { layers, geoJsonRegistry } = useMapStore.getState();
    const { uiContext, keys, snapshot } = deriveContext(
      layers,
      geoJsonRegistry,
      get().dateRange
    );

    // Add user message with a read-only snapshot of the context it was sent with
    addMessage({
      type: "user",
      message,
      context: snapshot,
    });

    // Clear any previous tool steps and start loading
    clearToolSteps();
    set({ reasoningStartTime: Date.now() });
    setLoading(true);
    // Reset any stale insight-generating flag from a prior turn; it is set
    // true only once this turn's agent announces a generate_insights call.
    setGeneratingInsight(false);

    const ui_context = diffUiContext(uiContext, keys, get().lastSentContext);
    // Record what we're sending so the same context isn't re-announced next
    // turn. Agent picks arriving during the stream fold their slots on top.
    set({ lastSentContext: keys });

    const prompt: ChatPrompt = {
      query: message,
      query_type: queryType,
      thread_id: threadId,
    };

    // Set up abort controller for client-side timeout and user cancellation
    const abortController = new AbortController();
    set({ abortController });
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
      let pendingNudge: SuggestedDataset[] | null = null;

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
              },
              () => pendingNudge,
              (datasets) => {
                pendingNudge = datasets;
              },
              setGeneratingInsight
            );
          } catch (err) {
            if (isFinal) {
              console.error(
                "Failed to parse final LangChain message",
                data,
                err
              );
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
      } else if (abortController.signal.aborted) {
        console.log("FRONTEND: Stream ended due to abort signal");
      }
    } catch (error) {
      console.error("Error sending message:", error);

      // Check if error was due to abort (user cancel or timeout)
      // cancelRequest() nulls abortController before aborting, so null here means user cancel
      if (error instanceof Error && error.name === "AbortError") {
        const wasUserCancel = get().abortController === null;
        if (wasUserCancel) {
          console.log("FRONTEND: Request cancelled by user");
          // A user-initiated stop is not a failure — render a neutral status
          // (no red alert), not the red error treatment.
          addMessage({
            type: "stopped",
            message: "Response stopped",
          });
        } else {
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
        }
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
      set({ abortController: null });

      // Attach tool steps to the user message before clearing loading state
      const { attachToolStepsToLastUserMessage } = get();
      attachToolStepsToLastUserMessage();

      setLoading(false);
      // Safety net: clear the insight-generating flag in case generate_insights
      // was announced but never produced a result (error, abort, timeout).
      setGeneratingInsight(false);

      queryClient.invalidateQueries({ queryKey: ["threads"] });
      return { isNew: !currentThreadId, id: threadId };
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setGeneratingInsight: (generating) =>
    set({ isGeneratingInsight: generating }),

  cancelRequest: () => {
    const controller = get().abortController;
    set({ abortController: null });
    controller?.abort();
  },

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
    const {
      setLoading,
      setGeneratingInsight,
      addMessage,
      addToolStep,
      clearToolSteps,
      setDateRange,
    } = get();

    // Clear any previous tool steps and start loading
    clearToolSteps();
    set({ reasoningStartTime: Date.now() });
    setLoading(true);
    setGeneratingInsight(false);
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
      let pendingNudgeThread: SuggestedDataset[] | null = null;

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
                const last = new Date(
                  currentToolSteps[currentToolSteps.length - 1].timestamp
                ).getTime();
                const historicalDuration =
                  isNaN(first) || isNaN(last) ? 0 : (last - first) / 1000;
                get().attachToolStepsToLastUserMessage(historicalDuration);
                get().clearToolSteps();
              }

              if (streamMessage.aoi_selection || streamMessage.aoi) {
                // pickAoiTool adds the area layer(s); the context snapshot below
                // is derived from the resulting layer state.
                await pickAoiTool(streamMessage, addMessage);
              }

              if (streamMessage.start_date && streamMessage.end_date) {
                setDateRange({
                  start: new Date(streamMessage.start_date),
                  end: new Date(streamMessage.end_date),
                });
              }

              // Snapshot the context active at this turn from the rehydrated
              // layers + date range — the same derivation used by live sends.
              const { layers, geoJsonRegistry } = useMapStore.getState();
              const { snapshot } = deriveContext(
                layers,
                geoJsonRegistry,
                get().dateRange
              );

              addMessage({
                type: "user",
                message: streamMessage.text!,
                context: snapshot,
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
              },
              () => pendingNudgeThread,
              (datasets) => {
                pendingNudgeThread = datasets;
              },
              setGeneratingInsight
            );
          } catch (err) {
            if (isFinal) {
              console.error(
                "Failed to parse final LangChain message",
                data,
                err
              );
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

      // Seed the last-sent context from the fully rehydrated layers + date
      // range, so the first new message on this thread only sends what changed.
      const { layers, geoJsonRegistry } = useMapStore.getState();
      const { keys } = deriveContext(layers, geoJsonRegistry, get().dateRange);
      set({ lastSentContext: keys });

      // Flush any remaining tool steps for the last user message
      const finalToolSteps = get().toolSteps;
      if (finalToolSteps.length > 0) {
        const first = new Date(finalToolSteps[0].timestamp).getTime();
        const last = new Date(
          finalToolSteps[finalToolSteps.length - 1].timestamp
        ).getTime();
        const historicalDuration =
          isNaN(first) || isNaN(last) ? 0 : (last - first) / 1000;
        get().attachToolStepsToLastUserMessage(historicalDuration);
      }

      setLoading(false);
      setGeneratingInsight(false);
    }
  },
}));

export default useChatStore;
