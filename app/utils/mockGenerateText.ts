import { Report } from "@/app/types/report";

const LOREM_PARAGRAPHS = [
  "Based on the available data, there has been a notable shift in land cover distribution over the observed period. Tree cover has shown a gradual decline in several key regions, while areas classified as cropland and built-up surfaces have expanded. This pattern is consistent with broader trends of agricultural expansion and urbanisation observed across tropical and subtropical zones.",
  "The rate of change appears to have accelerated in the most recent five-year window, with annual loss rates approximately 15% higher than the preceding decade. Wetland areas have been disproportionately affected, losing an estimated 8% of their extent. These changes have significant implications for carbon storage, biodiversity, and local water cycles.",
  "It is worth noting that the data reflects net change and does not capture the full dynamics of loss and regrowth within each period. Some regions show signs of recovery, particularly where reforestation programmes have been implemented. However, the overall trajectory remains one of net natural habitat loss, underscoring the need for targeted conservation interventions.",
];

/**
 * Mock text generation service.
 *
 * Logs the payload that would be sent to the real API, waits 1.5–2s,
 * and returns 2–3 paragraphs of lorem ipsum.
 *
 * Designed to match the real endpoint signature so it can be swapped later:
 * `{ report, prompt, focusWidgetId }`
 */
export default async function mockGenerateText(
  report: Report,
  prompt: string,
  focusWidgetId: string | null = null
): Promise<string> {
  // Log what would be sent to the API
  const focusWidget = focusWidgetId
    ? report.blocks.find((b) => b.id === focusWidgetId)?.widget
    : null;

  console.log("[mockGenerateText] Would send to API:", {
    reportTitle: report.title,
    blockCount: report.blocks.length,
    insightBlocks: report.blocks
      .filter((b) => b.kind === "insight")
      .map((b) => ({
        id: b.id,
        type: b.widget?.type,
        title: b.widget?.title,
      })),
    prompt,
    focusWidgetId,
    focusWidgetTitle: focusWidget?.title ?? null,
  });

  // Random delay 1.5–2s
  const delay = 1500 + Math.random() * 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Return 2–3 paragraphs
  const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
  return LOREM_PARAGRAPHS.slice(0, count).join("\n\n");
}
