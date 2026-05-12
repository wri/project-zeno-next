// Adapted from origin/report-builder-final's mockGenerateText.
// In the prototype this stands in for a real text-generation endpoint —
// it logs the payload it would send, waits 1–2s, and returns 2–3
// paragraphs of analytical-sounding lorem so demos feel real.

import type { Report, AreaDashboard, Block } from "@/app/types/portfolio";

// Prefix used so the UI can mark generated copy as mock content.
export const MOCK_TEXT_PREFIX =
  "⚠️ **Mock data** — placeholder text, not a real AI response.\n\n";

const LOREM_PARAGRAPHS: string[] = [
  "Based on the available data, there has been a notable shift in land cover distribution over the observed period. Tree cover has shown a gradual decline in several key regions, while areas classified as cropland and built-up surfaces have expanded. This pattern is consistent with broader trends of agricultural expansion and urbanisation observed across tropical and subtropical zones.",
  "The rate of change has accelerated in the most recent five-year window, with annual loss rates approximately 15% higher than the preceding decade. Wetland areas have been disproportionately affected, losing an estimated 8% of their extent. These changes have significant implications for carbon storage, biodiversity, and local water cycles.",
  "It is worth noting that the data reflects net change and does not capture the full dynamics of loss and regrowth within each period. Some regions show signs of recovery, particularly where reforestation programmes have been implemented. However, the overall trajectory remains one of net natural habitat loss, underscoring the need for targeted conservation interventions.",
];

type GenerateContext = {
  // Either a Report or an AreaDashboard — both share a blocks: Block[] shape.
  workspace: Report | AreaDashboard;
  // Optional focus block id — when present the prompt is "about" that block.
  focusBlockId?: string;
  // The user's prompt (or "" for a default summary).
  prompt: string;
};

export default async function mockGenerateText(
  ctx: GenerateContext
): Promise<string> {
  const { workspace, focusBlockId, prompt } = ctx;
  const focusBlock: Block | undefined = focusBlockId
    ? workspace.blocks.find((b) => b.id === focusBlockId)
    : undefined;

  // Debug payload so a viewer can see what a real API would receive.
  console.log("[mockGenerateText] Would send to API:", {
    workspaceTitle: workspace.name,
    blockCount: workspace.blocks.length,
    insightBlocks: workspace.blocks
      .filter((b) => b.type === "insight")
      .map((b) => ({ id: b.id, insightId: b.insightId })),
    prompt,
    focusBlockId,
    focusBlockType: focusBlock?.type ?? null,
  });

  // Random delay 1–2s so the loading state is visible.
  const delay = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const count = 2 + Math.floor(Math.random() * 2); // 2 or 3 paragraphs
  return MOCK_TEXT_PREFIX + LOREM_PARAGRAPHS.slice(0, count).join("\n\n");
}
