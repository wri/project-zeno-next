import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import JSON5 from "json5";
import {
  ChatMessage,
  ChatPrompt,
  StreamMessage,
  QueryType,
  InsightWidget,
  RawInsightData,
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
    // Handle error messages from LangChain tools
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
    else if (streamMessage.name === "pick-aoi" && streamMessage.artifact) {
      try {
        const { addGeoJsonFeature, flyToGeoJsonWithRetry } =
          useMapStore.getState();
        const { addContext } = useContextStore.getState();

        const artifactArray = Array.isArray(streamMessage.artifact)
          ? streamMessage.artifact
          : [streamMessage.artifact];
        const artifact = artifactArray[0];
        const geoJsonData =
          typeof artifact === "string" ? JSON.parse(artifact) : artifact;

        const featureId = `location-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        addGeoJsonFeature({
          id: featureId,
          name: streamMessage.content || "Location",
          data: geoJsonData,
        });

        flyToGeoJsonWithRetry(geoJsonData);

        let countryName: string | undefined;

        if (
          streamMessage.content &&
          typeof streamMessage.content === "string"
        ) {
          try {
            const parsedContent = JSON.parse(
              streamMessage.content.replace(/'/g, '"')
            );
            if (
              Array.isArray(parsedContent) &&
              parsedContent.length > 0 &&
              Array.isArray(parsedContent[0]) &&
              parsedContent[0].length > 0
            ) {
              countryName = parsedContent[0][0];
            }
          } catch (error) {
            console.error(
              "Error parsing pick-aoi content:",
              streamMessage.content,
              error
            );
            countryName = streamMessage.content
              ?.split(",")[0]
              .replace(/\[|'|"/g, "")
              .trim();
          }
        }

        if (countryName) {
          addContext({
            contextType: "area",
            content: countryName,
          });
        }

        artifactText = `Location found and displayed on map: ${
          countryName || "Unknown location"
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prompt),
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

      while (!readerDone) {
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

      // Handle any remaining data in the buffer
      if (buffer.trim()) {
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
      addMessage({
        type: "assistant",
        message:
          "Sorry, there was an error processing your request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useChatStore;
