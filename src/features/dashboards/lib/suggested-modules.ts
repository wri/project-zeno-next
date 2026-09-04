import {
  ChartPieSliceIcon,
  CloudIcon,
  FireIcon,
  GlobeIcon,
  GrainsIcon,
  LeafIcon,
  LogIcon,
  NotepadIcon,
  PlantIcon,
  SirenIcon,
  SplitHorizontalIcon,
  TractorIcon,
  TreeIcon,
  type Icon,
} from "@phosphor-icons/react";

/**
 * A "Suggested modules" tile that runs one of the backend's curated
 * (deterministic, LLM-free) analyses for the dashboard's area and adds the
 * result as a widget — the same run-then-add path as the Analyses pane's
 * Curated cards, no chat round-trip. `datasetId` is the catalogue dataset the
 * analysis is computed from; the tile resolves the rest (name, chart hint)
 * from the curated catalogue in the analysis slice at render time.
 */
export interface CuratedSuggestedModule {
  kind: "curated";
  id: string;
  label: string;
  icon: Icon;
  datasetId: number;
}

/**
 * A tile that injects a canned prompt into the chat pipeline so the agent
 * does the work — the original MVP approach, kept for the analyses no
 * deterministic generator covers. `promptKind` separates the cards that ask
 * the agent to run an analysis (chart + text block + map) from plain content
 * adds (satellite imagery, summarising the dashboard).
 */
export interface PromptSuggestedModule {
  kind: "prompt";
  id: string;
  label: string;
  icon: Icon;
  prompt: string;
  promptKind: "analysis" | "action";
}

export type SuggestedModule = CuratedSuggestedModule | PromptSuggestedModule;

/**
 * The lime cards in the "Suggested modules" row (Figma node 1475:4879), in
 * display order: every curated analysis first, in the suite's order (the ten
 * datasets of `CURATED_ANALYSES` in the analysis slice; the lib test pins the
 * two lists to each other), then the chat-driven tiles. The row's two neutral
 * cards ("Text block", "Describe your own via the chat") are not modules and
 * live in the component.
 */
export const SUGGESTED_MODULES: readonly SuggestedModule[] = [
  {
    kind: "curated",
    id: "land-cover-distribution",
    label: "Land cover distribution",
    icon: ChartPieSliceIcon,
    datasetId: 1,
  },
  {
    kind: "curated",
    id: "grassland-extent",
    label: "Grassland extent analysis",
    icon: GrainsIcon,
    datasetId: 2,
  },
  {
    kind: "curated",
    id: "natural-lands",
    label: "Natural lands breakdown",
    icon: LeafIcon,
    datasetId: 3,
  },
  {
    kind: "curated",
    id: "tree-cover-loss",
    label: "Tree cover loss analysis",
    icon: LogIcon,
    datasetId: 4,
  },
  {
    kind: "curated",
    id: "tree-cover-gain",
    label: "Tree cover gain analysis",
    icon: PlantIcon,
    datasetId: 5,
  },
  {
    kind: "curated",
    id: "forest-carbon-flux",
    label: "Forest carbon flux",
    icon: CloudIcon,
    datasetId: 6,
  },
  {
    kind: "curated",
    id: "tree-cover-extent",
    label: "Tree cover extent",
    icon: TreeIcon,
    datasetId: 7,
  },
  {
    kind: "curated",
    id: "tree-cover-loss-by-driver",
    label: "Tree cover loss by driver",
    icon: TractorIcon,
    datasetId: 8,
  },
  {
    kind: "curated",
    id: "tree-cover-loss-fires",
    label: "Fire-related tree cover loss",
    icon: FireIcon,
    datasetId: 10,
  },
  {
    kind: "curated",
    id: "deforestation-alerts",
    label: "Monitor disturbance alerts",
    icon: SirenIcon,
    datasetId: 11,
  },
  {
    kind: "prompt",
    id: "compare-regions",
    label: "Compare to other regions",
    icon: SplitHorizontalIcon,
    prompt:
      "Compare this area to another region — start by asking me which area(s) to compare against — then add the comparison, a text block summarizing the insight, and a map to the dashboard.",
    promptKind: "analysis",
  },
  {
    kind: "prompt",
    id: "recent-satellite-imagery",
    label: "Recent satellite imagery",
    icon: GlobeIcon,
    prompt: "Add a recent satellite imagery map of this area to the dashboard.",
    promptKind: "action",
  },
  {
    kind: "prompt",
    id: "summarise-dashboard",
    label: "Summarise the dashboard",
    icon: NotepadIcon,
    prompt:
      "Summarize what this dashboard currently shows and add the summary to the dashboard as a text block.",
    promptKind: "action",
  },
];

export const CURATED_SUGGESTED_MODULES: readonly CuratedSuggestedModule[] =
  SUGGESTED_MODULES.filter(
    (m): m is CuratedSuggestedModule => m.kind === "curated"
  );

export const SUGGESTED_PROMPT_MODULES: readonly PromptSuggestedModule[] =
  SUGGESTED_MODULES.filter(
    (m): m is PromptSuggestedModule => m.kind === "prompt"
  );

/**
 * What a curated tile shows for its analysis on this dashboard. A tile whose
 * analysis is already on the dashboard stays visible but inert (hiding it
 * would reshuffle the row as widgets land and lose the "what is covered"
 * signal); one whose analysis is on its way reads as running.
 */
export type CuratedTileStatus = "idle" | "pending" | "on-dashboard";

export function curatedTileStatus(
  added: boolean,
  pending: boolean
): CuratedTileStatus {
  if (added) return "on-dashboard";
  if (pending) return "pending";
  return "idle";
}
