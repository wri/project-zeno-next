import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import JSON5 from "json5";
import { FeatureCollection } from "geojson";
import {
  ChatMessage,
  ChatPrompt,
  StreamMessage,
  QueryType,
  InsightWidget,
  RawInsightData,
  AOI,
} from "@/app/types/chat";
import useMapStore from "./mapStore";
import useContextStore from "./contextStore";

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
      return;
    }

    // Handle other error messages from LangChain tools
    addMessage({
      type: "error",
      message:
        "I encountered an error while processing your request. Please try rephrasing your question or try again.",
    });
    return;
  } else if (streamMessage.type === "text" && streamMessage.text) {
    addMessage({
      type: "assistant",
      message: streamMessage.text,
    });
  } else if (streamMessage.type === "tool") {
    // Handle tool/artifact messages with better formatting
    let artifactText = `Tool: ${streamMessage.name || "Unknown"}`;

    // Special handling for generate-insights tool
    if (streamMessage.name === "generate-insights" && streamMessage.content) {
      try {
        const artifactData =
          typeof streamMessage.content === "string"
            ? JSON5.parse(streamMessage.content)
            : streamMessage.content;

        // Handle generic insights (previously kba-insights-tool)
        if (artifactData.insights && Array.isArray(artifactData.insights)) {
          const widgets: InsightWidget[] = artifactData.insights.map(
            (insight: RawInsightData) => ({
              type: insight.type as InsightWidget["type"],
              title: insight.title,
              description: insight.description,
              data: insight.data,
            })
          );

          addMessage({
            type: "widget",
            message: "Insights generated",
            widgets: widgets,
          });
          return;
        }
        // Handle timeseries insights (previously kba-timeseries-tool)
        else if (artifactData.type === "timeseries") {
          const widget: InsightWidget = {
            type: "timeseries",
            title: artifactData.title || "Time Series Analysis",
            description:
              artifactData.description || "Time series data analysis",
            data: artifactData,
          };
          addMessage({
            type: "widget",
            message: artifactData.title || "Time Series Analysis",
            widgets: [widget],
          });
          return;
        } else {
          console.error(
            "Unknown insight format for generate-insights tool:",
            artifactData
          );
          artifactText = `Insights generated, but format not recognized.`;
        }
      } catch (error) {
        console.error("Error processing generate-insights artifact:", error);
        artifactText = `Generate insights tool executed but failed to parse data: ${
          streamMessage.content || "Unknown insights"
        }`;
      }
    }
    // Special handling for pick-aoi tool (previously location-tool)
    else if (streamMessage.name === "pick-aoi" && streamMessage.aoi) {
      try {
        const { addGeoJsonFeature, flyToGeoJsonWithRetry } =
          useMapStore.getState();
        const { addContext } = useContextStore.getState();

        const geoJsonData = (streamMessage.aoi as AOI)
          .geometry as FeatureCollection;

        const featureId = `location-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        addGeoJsonFeature({
          id: featureId,
          name: streamMessage.content || "Location",
          data: geoJsonData,
        });

        flyToGeoJsonWithRetry(geoJsonData);
        console.log(streamMessage);
        const aoiName = (streamMessage.aoi as AOI).name as string;
        console.log(streamMessage.aoi);

        if (aoiName) {
          addContext({
            contextType: "area",
            content: aoiName,
          });
        }

        artifactText = `Location found and displayed on map: ${
          aoiName || "Unknown location"
        }`;
      } catch (error) {
        console.error("Error processing pick-aoi artifact:", error);
        artifactText = `AOI tool executed but failed to display on map: ${
          streamMessage.content || "Unknown location"
        }`;
      }
    }
    // Handling for pick-dataset tool
    else if (streamMessage.name === "pick-dataset") {
      artifactText = `Dataset picker tool executed.`;
      addMessage({
        type: "assistant",
        message: artifactText,
      });
      return;
    }
    // Handling for pull-data tool
    else if (streamMessage.name === "pull-data") {
      artifactText = `Data pull tool executed.`;
      addMessage({
        type: "assistant",
        message: artifactText,
      });
      return;
    }

    addMessage({
      type: "assistant",
      message: artifactText,
    });
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

      // Process the simplified streaming response
      const utf8Decoder = new TextDecoder("utf-8");
      const reader = response.body.getReader();
      let { value: chunk, done: readerDone } = await reader.read();
      let decodedChunk = chunk
        ? utf8Decoder.decode(chunk, { stream: true })
        : "";

      let buffer = ""; // Accumulate partial chunks

      while (!readerDone && !abortController.signal.aborted) {
        buffer += decodedChunk; // Append current chunk to buffer

        let lineBreakIndex;
        while ((lineBreakIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, lineBreakIndex).trim(); // Extract the line
          buffer = buffer.slice(lineBreakIndex + 1); // Remove processed line

          if (line) {
            try {
              const streamMessage: StreamMessage = JSON.parse(line);

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

      // Log why the loop ended
      if (readerDone) {
        console.log("FRONTEND: Stream ended normally (readerDone = true)");
      } else if (abortController.signal.aborted) {
        console.log("FRONTEND: Stream ended due to abort signal");
      }

      // Handle any remaining data in the buffer
      if (buffer.trim() && !abortController.signal.aborted) {
        try {
          const streamMessage: StreamMessage = JSON.parse(buffer);

          processStreamMessage(streamMessage, addMessage);
        } catch (err) {
          console.error(
            "Failed to parse final simplified message",
            buffer,
            err
          );
        }
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
