import {
  ChartPieSliceIcon,
  GlobeIcon,
  GrainsIcon,
  LogIcon,
  NotepadIcon,
  SirenIcon,
  SplitHorizontalIcon,
  type Icon,
} from "@phosphor-icons/react";

/**
 * One of the lime cards in the "Suggested modules" row (Figma node
 * 1475:4879). Each just injects a canned prompt into the existing chat
 * pipeline — the same MVP approach as `runAnalysis`/`DashboardChatNudges`:
 * generative now, with a curated/deterministic swap deliberately deferred
 * until a real backend source exists for more than tree cover loss.
 *
 * `kind` distinguishes the cards that ask the agent to run an analysis
 * (chart + text block + map, all added to the dashboard) from the ones that
 * are a plain content add with no analysis framing (satellite imagery,
 * summarising the dashboard's existing content).
 */
export interface SuggestedPromptModule {
  id: string;
  label: string;
  icon: Icon;
  prompt: string;
  kind: "analysis" | "action";
  /**
   * Card only makes sense once the dashboard has widgets (e.g. summarising
   * existing content) — surfaces rendering the row for an empty dashboard
   * filter these out.
   */
  requiresContent?: boolean;
}

export const SUGGESTED_PROMPT_MODULES: SuggestedPromptModule[] = [
  {
    id: "tree-cover-loss",
    label: "Tree cover loss analysis",
    icon: LogIcon,
    prompt:
      "Analyse recent tree cover loss in this area, then add the analysis, a text block summarizing the insight, and a map to the dashboard.",
    kind: "analysis",
  },
  {
    id: "deforestation-alerts",
    label: "Monitor disturbance alerts",
    icon: SirenIcon,
    prompt:
      "Analyse recent alerts in this area, then add the analysis, a text block summarizing the insight, and a map to the dashboard.",
    kind: "analysis",
  },
  {
    id: "land-cover-distribution",
    label: "Land cover distribution",
    icon: ChartPieSliceIcon,
    prompt:
      "Analyse land cover distribution in this area, then add the analysis, a text block summarizing the insight, and a map to the dashboard.",
    kind: "analysis",
  },
  {
    id: "grassland-extent",
    label: "Grassland extent analysis",
    icon: GrainsIcon,
    prompt:
      "Analyse grassland extent in this area, then add the analysis, a text block summarizing the insight, and a map to the dashboard.",
    kind: "analysis",
  },
  {
    id: "compare-regions",
    label: "Compare to other regions",
    icon: SplitHorizontalIcon,
    prompt:
      "Compare this area to another region — start by asking me which area(s) to compare against — then add the comparison, a text block summarizing the insight, and a map to the dashboard.",
    kind: "analysis",
  },
  {
    id: "recent-satellite-imagery",
    label: "Recent satellite imagery",
    icon: GlobeIcon,
    prompt: "Add a recent satellite imagery map of this area to the dashboard.",
    kind: "action",
  },
  {
    id: "summarise-dashboard",
    label: "Summarise the dashboard",
    icon: NotepadIcon,
    prompt:
      "Summarize what this dashboard currently shows and add the summary to the dashboard as a text block.",
    kind: "action",
    requiresContent: true,
  },
];
