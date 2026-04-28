// Single source of display strings for backend tool names. Adding a new
// tool here surfaces every place it needs a label (reasoning timeline,
// recoverable-error notice).

const TOOL_DISPLAY: Record<string, { active: string; error: string }> = {
  generate_insights: {
    active: "Generating insights",
    error: "Unable to generate a chart. Please try again.",
  },
  pick_aoi: {
    active: "Picking area of interest",
    error: "Unable to find the area of interest. Please try again.",
  },
  pick_dataset: {
    active: "Selecting dataset",
    error: "Unable to select a dataset. Please try again.",
  },
  pull_data: {
    active: "Pulling data",
    error: "Unable to retrieve the data. Please try again.",
  },
};

const DEFAULT_TOOL_ERROR = "Unable to process this step. Please try again.";

export function formatToolName(toolName: string): string {
  return TOOL_DISPLAY[toolName]?.active ?? `Processing ${toolName}`;
}

// Recoverable tool error: the agent continues with a follow-up assistant
// message, so the wording names the failed step and prompts retry rather
// than implying the chat is broken.
export function getToolErrorMessage(toolName?: string): string {
  if (!toolName) return DEFAULT_TOOL_ERROR;
  return TOOL_DISPLAY[toolName]?.error ?? DEFAULT_TOOL_ERROR;
}
