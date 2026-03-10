import { Report } from "@/app/types/report";
import { API_CONFIG } from "@/app/config/api";

const DEBUG =
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true";

/**
 * Calls the sidecar endpoint to generate text about a report.
 *
 * Throws on failure so callers can show appropriate error UI.
 *
 * When `NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=true`, logs the full request
 * payload to the browser console.
 */
export default async function generateText(
  report: Report,
  prompt: string,
  focusWidgetId: string | null = null
): Promise<string> {
  // Exclude AI-generated text blocks from the context sent to the API
  // so the model doesn't use its own prior outputs as source material.
  const contextBlocks = report.blocks.filter((b) => !b.generatedByAi);

  const body = {
    report: {
      id: report.id,
      title: report.title,
      blocks: contextBlocks.map((b) => ({
        id: b.id,
        kind: b.kind,
        widget: b.widget
          ? {
              type: b.widget.type,
              title: b.widget.title,
              description: b.widget.description,
              data: b.widget.data,
              xAxis: b.widget.xAxis,
              yAxis: b.widget.yAxis,
              metadata: b.widget.metadata ?? null,
            }
          : null,
        content: b.content ?? null,
        size: b.size,
        order: b.order,
      })),
    },
    prompt,
    focusWidgetId,
  };

  if (DEBUG) {
    console.group("[generateText] Request payload");
    console.log("Endpoint:", API_CONFIG.REPORT_ENDPOINTS.GENERATE_TEXT);
    console.log("Prompt:", prompt);
    console.log("Focus widget ID:", focusWidgetId);
    console.log("Report context:", body.report);
    console.log("Full body:", JSON.parse(JSON.stringify(body)));
    console.groupEnd();
  }

  const response = await fetch(
    API_CONFIG.REPORT_ENDPOINTS.GENERATE_TEXT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Text generation failed (${response.status} ${response.statusText})`
    );
  }

  const data = await response.json();

  if (!data.text) {
    throw new Error("Text generation returned an empty response");
  }

  return data.text;
}
