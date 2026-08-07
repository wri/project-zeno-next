"use client";

import { Box } from "@chakra-ui/react";

import { CatalogCard } from "@/app/components/CatalogCard";
import InsightCaption from "@/app/components/InsightCaption";
import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";
import {
  CURATED_ANALYSIS_TEMPLATES,
  type CuratedAnalysisTemplate,
} from "../lib/curated-analyses";
import { useCuratedAnalysis } from "./use-curated-analysis";
import {
  InsightThumbnail,
  INSIGHT_LABEL_COLOR,
  INSIGHT_SELECTED_BG,
} from "./insight-thumbnail";

/** "UMD · 2001–2025" — the curated card's provenance line. */
function templateDescription(template: CuratedAnalysisTemplate): string {
  const window = `${template.startDate.slice(0, 4)}–${template.endDate.slice(0, 4)}`;
  return [template.provider, window].filter(Boolean).join(" · ");
}

/**
 * The Curated filter's card list on a dashboard: one card per predefined
 * analysis template. Unlike the other filters' cards (which carry data
 * already), a curated card *pulls* its data — the first toggle runs the
 * dataset's analysis against the dashboard's own AOI and adds the resulting
 * charts to the grid; later toggles reuse that insight (use-curated-analysis).
 */
export function CuratedAnalysesList() {
  return (
    <>
      {CURATED_ANALYSIS_TEMPLATES.map((template) => (
        <CuratedAnalysisCard key={template.datasetId} template={template} />
      ))}
    </>
  );
}

function CuratedAnalysisCard({
  template,
}: {
  template: CuratedAnalysisTemplate;
}) {
  const analysis = useCuratedAnalysis(template);

  // "Generating…" only while the analysis itself runs; the widget add/remove
  // mutations are near-instant and just disable the toggle via `pending`.
  const toggleLabel = analysis.running
    ? "Generating…"
    : analysis.shown
      ? "On dashboard"
      : "Add to dashboard";

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={<InsightThumbnail type="bar" />}
        typeLabel="ANALYSIS"
        typeLabelColor={INSIGHT_LABEL_COLOR}
        title={analysis.title}
        description={templateDescription(template)}
        selected={analysis.shown}
        selectedBg={INSIGHT_SELECTED_BG}
        showOnMap={analysis.shown}
        onShowOnMapChange={() => analysis.toggle()}
        toggleLabel={toggleLabel}
        toggleAriaLabel={
          analysis.shown
            ? `Remove ${analysis.title} from dashboard`
            : `Add ${analysis.title} to dashboard`
        }
        toggleDisabled={!analysis.addable || analysis.pending}
        badge={<InsightCaption curated showLearnMore={false} />}
      />
    </Box>
  );
}
