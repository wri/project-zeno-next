import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import JSON5 from 'json5';
import { ChatMessage, ChatPrompt, StreamMessage, QueryType, InsightWidget, RawInsightData } from '@/app/types/chat';
import useMapStore from './mapStore';
import useContextStore from './contextStore';

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
  if (streamMessage.type === 'error') {
    // Handle error messages from LangChain tools
    addMessage({
      type: 'error',
      message: 'I encountered an error while processing your request. Please try rephrasing your question or try again.'
    });
    return;
  } else if (streamMessage.type === 'text' && streamMessage.text) {
    addMessage({
      type: 'assistant',
      message: streamMessage.text
    });
  } else if (streamMessage.type === 'tool') {
    // Handle tool/artifact messages with better formatting
    let artifactText = `Tool: ${streamMessage.name || 'Unknown'}`;
    
    // Special handling for kba-insights-tool
    if (streamMessage.name === 'kba-insights-tool' && streamMessage.content) {
      try {
        // Parse the insights data
        const artifactData = typeof streamMessage.content === 'string' 
          ? JSON5.parse(streamMessage.content) 
          : streamMessage.content;
        // Convert insights to widgets
        const widgets: InsightWidget[] = artifactData.insights.map((insight: RawInsightData) => ({
          type: insight.type as InsightWidget['type'], // Type assertion to convert string to specific union type
          title: insight.title,
          description: insight.description,
          data: insight.data
        }));

        // Add widget message
        addMessage({
          type: 'widget',
          message: streamMessage.content || 'KBA Insights Analysis',
          widgets: widgets
        });
        
        return; // Early return to avoid adding the text message below
        
      } catch (error) {
        console.error('Error processing kba-insights-tool artifact:', error);
        artifactText = `KBA insights tool executed but failed to parse data: ${streamMessage.content || 'Unknown insights'}`;
      }
    }
    // Special handling for kba-timeseries-tool
    else if (streamMessage.name === 'kba-timeseries-tool' && streamMessage.content) {
      try {
        // Parse the timeseries data using JSON5 to handle NaN values
        const timeseriesData = typeof streamMessage.content === 'string' 
          ? JSON5.parse(streamMessage.content) 
          : streamMessage.content;
        
        // Convert timeseries data to widget format
        const widget: InsightWidget = {
          type: timeseriesData.type || 'timeseries',
          title: timeseriesData.title || 'Time Series Analysis',
          description: timeseriesData.description || 'Time series data analysis',
          data: timeseriesData
        };

        // Add widget message
        addMessage({
          type: 'widget',
          message: timeseriesData.title || 'Time Series Analysis',
          widgets: [widget]
        });
        
        return; // Early return to avoid adding the text message below
        
      } catch (error) {
        console.error('Error processing kba-timeseries-tool artifact:', error);
        artifactText = `KBA timeseries tool executed but failed to parse data: ${streamMessage.content || 'Unknown timeseries data'}`;
      }
    }
    // Special handling for location-tool
    else if (streamMessage.name === 'location-tool' && streamMessage.artifact) {
      try {
        // Get map store instance to add GeoJSON and fly to location
        const { addGeoJsonFeature, flyToGeoJsonWithRetry } = useMapStore.getState();
        const { addContext } = useContextStore.getState();
        
        // Parse the GeoJSON from the artifact
        const artifactArray = Array.isArray(streamMessage.artifact) ? streamMessage.artifact : [streamMessage.artifact];
        const artifact = artifactArray[0];
        const geoJsonData = typeof artifact === 'string' 
          ? JSON.parse(artifact) 
          : artifact;
        
        // Generate a unique ID for this feature
        const featureId = `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Add the GeoJSON feature to the map
        addGeoJsonFeature({
          id: featureId,
          name: streamMessage.content || 'Location',
          data: geoJsonData
        });
        
        // Use retry mechanism to handle HMR issues
        flyToGeoJsonWithRetry(geoJsonData);
        
        // Add the location to the context store

        // location is a string in the format "[[CountryName, GADM type, GADM Id]]"
        // we need to extract the country name or return 'Unknown location' if the format is not correct
        let countryName: string | undefined;

        if (streamMessage.content && typeof streamMessage.content === 'string') {
          try {
            // The content is a string representation of a list of lists, e.g., "[['Indonesia', ...]]"
            // Python's string representation might use single quotes, so we replace them for valid JSON.
            const parsedContent = JSON.parse(streamMessage.content.replace(/'/g, '"'));
            if (Array.isArray(parsedContent) && parsedContent.length > 0 && Array.isArray(parsedContent[0]) && parsedContent[0].length > 0) {
              countryName = parsedContent[0][0];
            }
          } catch (error) {
            console.error('Error parsing location-tool content:', streamMessage.content, error);
            // Fallback for safety, though it may not be correct
            countryName = streamMessage.content?.split(',')[0].replace(/\[|'|"/g, '').trim();
          }
        }
        
        if (countryName) {
          addContext({
            contextType: 'area',
            content: countryName
          });
        }

        artifactText = `Location found and displayed on map: ${countryName || 'Unknown location'}`;
        
      } catch (error) {
        console.error('Error processing location-tool artifact:', error);
        artifactText = `Location tool executed but failed to display on map: ${streamMessage.content || 'Unknown location'}`;
      }
    }
    // Special handling for dist-alerts-tool
    else if (streamMessage.name === 'dist-alerts-tool' && streamMessage.content) {
      try {
        // Parse the disturbances data
        const alertsData = typeof streamMessage.content === 'string' 
          ? JSON.parse(streamMessage.content) 
          : streamMessage.content;
        
        // Extract the number of disturbances
        const numAlerts = alertsData.disturbances || 0;
        
        // Format the message
        artifactText = `Found ${numAlerts.toLocaleString()} alerts in the area of interest`;
        
      } catch (error) {
        console.error('Error processing dist-alerts-tool:', error);
        artifactText = `Disturbance alerts tool executed but failed to parse data: ${streamMessage.content || 'Unknown alerts count'}`;
      }
    }
    // Special handling for kba-data-tool
    else if (streamMessage.name === 'kba-data-tool' && streamMessage.artifact) {
      try {
        // Get map store instance to add GeoJSON and fly to location
        const { addGeoJsonFeature, flyToGeoJsonWithRetry } = useMapStore.getState();
        
        // Parse the GeoJSON from the artifact
        const artifact = streamMessage.artifact;
        const geoJsonData = typeof artifact === 'string' 
          ? JSON.parse(artifact) 
          : artifact;
        
        // Generate a unique ID for this feature with kba prefix for different styling
        const featureId = `kba-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Add the GeoJSON feature to the map with KBA-specific naming
        addGeoJsonFeature({
          id: featureId,
          name: streamMessage.content || 'KBA Data',
          data: geoJsonData
        });
        
        // Use retry mechanism to handle HMR issues
        flyToGeoJsonWithRetry(geoJsonData);
        
        artifactText = streamMessage.content || 'KBA data found and displayed on map';
        
      } catch (error) {
        console.error('Error processing kba-data-tool artifact:', error);
        artifactText = `KBA data tool executed but failed to display on map: ${streamMessage.content || 'Unknown KBA data'}`;
      }
    }
    
    addMessage({
      type: 'assistant',
      message: artifactText
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
    const { context } = useContextStore.getState();
    
    // Generate thread ID if this is the first message
    const threadId = currentThreadId || generateNewThread();
    
    // Add user message
    addMessage({
      type: 'user',
      message,
      context,
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