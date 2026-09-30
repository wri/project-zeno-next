"use client";

import { Box, Flex, Grid, Image, Text } from "@chakra-ui/react";
import { ShapesIcon, SpinnerGapIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { Dashboard } from "../api/schemas";
import {
  ANALYSIS_TEMPLATE_CARDS,
  templateErrorMessage,
  type AnalysisTemplateCard,
} from "../lib/analysis-templates";
import DashboardFooterHeading from "./DashboardFooterHeading";
import {
  useAnalysisTemplates,
  useApplyAnalysisTemplate,
  usePendingAnalysisTemplates,
} from "./dashboardQueries";
import { scrollToSectionWhenRendered } from "./scrollToSection";

// The design's lime card. The theme's secondary scale has no exact match
// (see DashboardSection's banner), so these stay literal.
const CARD_FILL = "#F0F9B9";
const CARD_OUTLINE = "#D0E35B";
const CARD_HOVER_FILL = "#D0E35B";
const CARD_HOVER_OUTLINE = "#C3D16F";
const CAPTION_COLOR = "rgba(19, 22, 25, 0.7)";

function TemplateCard({
  card,
  label,
  building,
  disabled,
  onClick,
}: {
  card: AnalysisTemplateCard;
  label: string;
  /** This card's request is in flight. */
  building: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const inert = building || disabled;
  return (
    <Flex
      as="button"
      // The label alone names the control; the caption changes with the state.
      aria-label={label}
      aria-disabled={inert}
      aria-busy={building}
      title={
        building
          ? "Building the section. This can take up to a minute."
          : undefined
      }
      onClick={inert ? undefined : onClick}
      align="center"
      gap="20px"
      h="120px"
      px="16px"
      py="20px"
      bg={CARD_FILL}
      borderWidth="1px"
      borderColor={CARD_OUTLINE}
      borderRadius="12px"
      textAlign="left"
      opacity={disabled && !building ? 0.5 : 1}
      cursor={building ? "progress" : disabled ? "not-allowed" : "pointer"}
      transition="background 0.15s ease, box-shadow 0.15s ease"
      _hover={
        inert
          ? undefined
          : {
              bg: CARD_HOVER_FILL,
              borderColor: CARD_HOVER_OUTLINE,
              // The design's Shadows/400.
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            }
      }
    >
      <Image
        src={card.image}
        alt=""
        w="80px"
        h="80px"
        flexShrink={0}
        objectFit="cover"
        borderRadius="8px"
      />
      <Flex direction="column" gap="4px" flex={1} minW={0} align="flex-start">
        <Flex align="center" gap="4px" color={CAPTION_COLOR}>
          {building ? (
            <Box
              display="flex"
              animation="spin 1s infinite"
              animationTimingFunction="steps(8, end)"
              aria-hidden
            >
              <SpinnerGapIcon size={16} />
            </Box>
          ) : (
            <ShapesIcon size={16} aria-hidden />
          )}
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            textTransform="uppercase"
            whiteSpace="nowrap"
          >
            {building ? "Building section..." : "Analysis template"}
          </Text>
        </Flex>
        <Text
          fontSize="18px"
          lineHeight="1.25"
          color="#393E29"
          wordBreak="break-word"
        >
          {label}
        </Text>
      </Flex>
    </Flex>
  );
}

/**
 * The "Add an analysis template" block of the dashboard footer (Figma nodes
 * 3938:11841–3938:12209). A card applies its template to the dashboard with
 * the template's default arguments: one request that pulls the data, builds
 * the widgets and writes one new section. The request is synchronous and
 * slow, so the card reads as building and every card stays inert until it
 * returns — two requests would make two sections.
 *
 * A card shows once the registry lists its template (its label comes from
 * there, in the user's language); while the registry loads, or if it fails,
 * the card shows with the design's copy, since the apply call does not need
 * the registry. Once the section lands the page scrolls to it and each
 * warning (an optional widget left out) is a toast. Owner-only: applying a
 * template writes to the dashboard.
 */
export default function DashboardAnalysisTemplates({
  dashboard,
  isOwner,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
}) {
  const { data: registry } = useAnalysisTemplates();
  const apply = useApplyAnalysisTemplate(dashboard.id);
  const pending = usePendingAnalysisTemplates(dashboard.id);
  // The template uses the dashboard's first area; without one the backend
  // answers 422, so the cards stay inert.
  const hasArea = dashboard.aois.length > 0;

  const cards = ANALYSIS_TEMPLATE_CARDS.flatMap((card) => {
    if (!registry) return [{ card, label: card.label }];
    const entry = registry.find((t) => t.name === card.name);
    return entry ? [{ card, label: entry.label }] : [];
  });

  if (!isOwner || cards.length === 0) return null;

  // mutateAsync rather than mutate's callbacks: on an empty dashboard the new
  // section swaps the hero for the grid, which unmounts this component before
  // mutate-level callbacks would run.
  const run = async (card: AnalysisTemplateCard) => {
    try {
      const result = await apply.mutateAsync({ template: card.name });
      for (const warning of result.warnings) {
        toaster.create({
          title: "Part of the template was left out",
          description: warning,
          type: "warning",
          duration: 8000,
        });
      }
      scrollToSectionWhenRendered(result.section_id);
    } catch (error) {
      toaster.create({
        ...templateErrorMessage(error),
        type: "error",
        duration: 6000,
      });
    }
  };

  return (
    <Flex direction="column" gap="16px">
      <DashboardFooterHeading>Add an analysis template</DashboardFooterHeading>
      <Text fontSize="14px" lineHeight="1.5" color="#565E7B">
        These templates are built from real data and curated by WRI to help you
        get started with common analysis workflows.
      </Text>
      <Grid
        mt="28px"
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        }}
        columnGap="22px"
        rowGap="30px"
      >
        {cards.map(({ card, label }) => (
          <TemplateCard
            key={card.name}
            card={card}
            label={label}
            building={pending.includes(card.name)}
            disabled={!hasArea || pending.length > 0}
            onClick={() => void run(card)}
          />
        ))}
      </Grid>
    </Flex>
  );
}
