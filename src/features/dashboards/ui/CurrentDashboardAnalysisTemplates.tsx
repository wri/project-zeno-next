"use client";

import { Text } from "@chakra-ui/react";

import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";
import { ANALYSIS_TEMPLATES_BLURB } from "../lib/analysis-templates";
import {
  AnalysisTemplateCards,
  useTemplateCards,
} from "./DashboardAnalysisTemplates";
import { useCurrentDashboard } from "./useCurrentDashboardArea";

function PaneMessage({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="sm" color="fg.muted" mt={4}>
      {children}
    </Text>
  );
}

/**
 * The Analyses pane's Templates tab (Figma node 3938:11994): the footer's
 * blurb and template cards, for the dashboard the viewer is on, in the pane's
 * compact card, stacked one per row at the pane's card width.
 */
export default function CurrentDashboardAnalysisTemplates() {
  const { dashboard, isOwner } = useCurrentDashboard();
  const cards = useTemplateCards(isOwner);

  if (!dashboard) return <PaneMessage>Loading this dashboard...</PaneMessage>;
  if (!isOwner) {
    return (
      <PaneMessage>
        Only the dashboard&apos;s owner can add a template to it.
      </PaneMessage>
    );
  }
  if (cards.length === 0) {
    return (
      <PaneMessage>No analysis templates are available right now.</PaneMessage>
    );
  }

  return (
    <>
      <Text
        maxW={`${CATALOG_CARD_WIDTH_PX}px`}
        fontSize="14px"
        lineHeight="1.5"
        color="#565E7B"
      >
        {ANALYSIS_TEMPLATES_BLURB}
      </Text>
      <AnalysisTemplateCards
        dashboard={dashboard}
        cards={cards}
        compact
        templateColumns={`minmax(0, ${CATALOG_CARD_WIDTH_PX}px)`}
        rowGap="20px"
      />
    </>
  );
}
