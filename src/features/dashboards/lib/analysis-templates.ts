/**
 * A card in the "Add an analysis template" row (Figma node 3938:12209).
 * `name` is the backend registry name (`GET /api/analysis-templates`), which
 * is what the card applies. `label` is the design's copy, shown until the
 * registry's label (already in the user's language) arrives.
 */
export interface AnalysisTemplateCard {
  name: string;
  label: string;
  /** Thumbnail under /public. */
  image: string;
}

/** The line above the template cards, in the footer and the Analyses pane. */
export const ANALYSIS_TEMPLATES_BLURB =
  "These templates are built from real data and curated by WRI to help you get started with common analysis workflows.";

/**
 * The template cards, in display order. Only the templates the backend
 * registers belong here; the design's other cards (tree cover loss, land
 * cover, …) wait for their registry entries.
 */
export const ANALYSIS_TEMPLATE_CARDS: readonly AnalysisTemplateCard[] = [
  {
    name: "nrt-monitoring",
    label: "Near real-time monitoring",
    image: "/analysis_template_nrt_monitoring.jpg",
  },
];

/**
 * The toast for a template request that failed, keyed on the statuses the
 * endpoint documents. Mapped by status rather than read from the message: a
 * 422 for bad args carries a list of validation errors, not a string.
 */
export function templateErrorMessage(error: unknown): {
  title: string;
  description: string;
} {
  const status = (error as { status?: number } | null)?.status;
  switch (status) {
    case 422:
      return {
        title: "Couldn't apply this template",
        description:
          "This dashboard has no area to analyse, or the template's settings were not accepted.",
      };
    case 404:
      return {
        title: "Couldn't apply this template",
        description: "This dashboard no longer exists, or it isn't yours.",
      };
    case 502:
      return {
        title: "Couldn't get the data for this template",
        description:
          "The analysis failed, so nothing was added. Please try again in a moment.",
      };
    default:
      return {
        title: "Couldn't apply this template",
        description: "Please try again.",
      };
  }
}
