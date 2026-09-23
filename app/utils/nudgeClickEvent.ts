import type { NudgeClickEvent } from "@/app/lib/track-event";
import type { Nudge } from "@/app/types/chat";
import { datasetChoiceEntry } from "./nudgeDataset";

const KNOWN_AGENT_NUDGE_TYPES = [
  "aoi_choice",
  "dashboard_choice",
  "insight_choice",
] as const;

type KnownAgentNudgeType = (typeof KNOWN_AGENT_NUDGE_TYPES)[number];

function isKnownAgentNudgeType(type: string): type is KnownAgentNudgeType {
  return (KNOWN_AGENT_NUDGE_TYPES as readonly string[]).includes(type);
}

/**
 * Builds the GTM nudge_click event for a pick on an agent nudge.
 *
 * dataset_choice keeps exactly the payload it has always had, so existing GA
 * reports on it stay continuous. Every other backend type reports its own
 * nudge_type (bounded: unknown and empty types become agent_other) plus the
 * raw type, the option index and the option text.
 */
export function toNudgeClickEvent(
  nudge: Nudge,
  index: number
): NudgeClickEvent {
  const option = nudge.options[index];
  if (nudge.type === "dataset_choice") {
    const dataset = datasetChoiceEntry(nudge, index);
    return {
      event: "nudge_click",
      nudge_type: "dataset_choice",
      dataset_name: dataset?.dataset_name ?? option,
      dataset_id: dataset?.dataset_id,
    };
  }
  return {
    event: "nudge_click",
    nudge_type: isKnownAgentNudgeType(nudge.type) ? nudge.type : "agent_other",
    agent_nudge_type: nudge.type,
    option_index: index,
    option_text: option,
  };
}
