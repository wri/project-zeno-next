import { Fragment } from "react";
import { Box, Flex, Grid, Image, Text, type GridProps } from "@chakra-ui/react";
import { ShapesIcon } from "@phosphor-icons/react";

import type { Dashboard } from "../api/schemas";
import {
  ANALYSIS_TEMPLATE_CARDS,
  ANALYSIS_TEMPLATES_BLURB,
  type AnalysisTemplateCard,
} from "../lib/analysis-templates";
import DashboardFooterHeading from "./DashboardFooterHeading";
import { useAnalysisTemplates } from "./dashboardQueries";
import RunningIcon from "./RunningIcon";
import { TEMPLATE_FILL, TEMPLATE_OUTLINE } from "./templateColors";
import {
  useApplyAnalysisTemplate,
  usePendingAnalysisTemplates,
} from "./useApplyAnalysisTemplate";

// The card's resting outline and its hover fill are one step darker than the
// section banner's lime.
const CARD_OUTLINE = "#D0E35B";
const CARD_HOVER_FILL = "#D0E35B";
const CAPTION_COLOR = "rgba(19, 22, 25, 0.7)";

/** `building`: this card's request is in flight; `disabled`: it can't run. */
type TemplateCardStatus = "idle" | "building" | "disabled";

// The footer grid's narrowest card: the thumbnail and gutters take 132px, and
// the rest has to hold a label's first words ("Near real-time") on one line.
// Four still fit across the design's 1180px row.
const MIN_CARD_WIDTH_PX = 270;

/**
 * A label that wraps only between words, never at a hyphen inside one:
 * "real-time" stays whole.
 */
function WordWrapped({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <Box as="span" whiteSpace="nowrap">
        {word}
      </Box>
    </Fragment>
  ));
}

function TemplateCard({
  card,
  status,
  compact,
  onClick,
}: {
  card: AnalysisTemplateCard;
  status: TemplateCardStatus;
  /** The Analyses pane's shorter card (Figma node 3938:12065). */
  compact: boolean;
  onClick: () => void;
}) {
  const building = status === "building";
  const idle = status === "idle";
  return (
    <Flex
      as="button"
      // The label alone names the control; the caption changes with the state.
      aria-label={card.label}
      aria-disabled={!idle}
      aria-busy={building}
      title={
        building
          ? "Building the section. This can take up to a minute."
          : undefined
      }
      onClick={idle ? onClick : undefined}
      align="center"
      gap="20px"
      h={compact ? "80px" : "120px"}
      px={compact ? "12px" : "16px"}
      py={compact ? "8px" : "20px"}
      bg={TEMPLATE_FILL}
      borderWidth="1px"
      borderColor={CARD_OUTLINE}
      borderRadius={compact ? "8px" : "12px"}
      textAlign="left"
      opacity={status === "disabled" ? 0.5 : 1}
      cursor={idle ? "pointer" : building ? "progress" : "not-allowed"}
      transition="background 0.15s ease, box-shadow 0.15s ease"
      _hover={
        idle
          ? {
              bg: CARD_HOVER_FILL,
              borderColor: TEMPLATE_OUTLINE,
              // The design's Shadows/400.
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            }
          : undefined
      }
    >
      <Image
        src={card.image}
        alt=""
        w="80px"
        h={compact ? "full" : "80px"}
        flexShrink={0}
        objectFit="cover"
        borderRadius="8px"
        // The footer sits below every section, so the thumbnail can wait.
        loading="lazy"
      />
      <Flex direction="column" gap="4px" flex={1} minW={0} align="flex-start">
        <Flex align="center" gap="4px" color={CAPTION_COLOR} maxW="full">
          {building ? (
            <RunningIcon size={16} />
          ) : (
            <ShapesIcon size={16} aria-hidden />
          )}
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            textTransform="uppercase"
            truncate
          >
            {building ? "Building..." : "Analysis template"}
          </Text>
        </Flex>
        <Text
          fontSize={compact ? "16px" : "18px"}
          lineHeight="1.25"
          color="#393E29"
        >
          <WordWrapped text={card.label} />
        </Text>
      </Flex>
    </Flex>
  );
}

/**
 * The cards to show: those whose template the registry lists. While the
 * registry loads, or if it fails, every card shows, since the apply call does
 * not need the registry. The label is the design's copy, like the rest of the
 * dashboard's card copy, not the registry's ("Near-real-time monitoring").
 * `enabled: false` skips the registry fetch for a viewer who will not see the
 * cards.
 */
export function useTemplateCards(enabled = true): AnalysisTemplateCard[] {
  const { data: registry } = useAnalysisTemplates(enabled);
  if (!registry) return [...ANALYSIS_TEMPLATE_CARDS];
  return ANALYSIS_TEMPLATE_CARDS.filter((card) =>
    registry.some((t) => t.name === card.name)
  );
}

/**
 * The template cards, shared by the dashboard footer and the Analyses pane's
 * Templates tab; the grid layout is the caller's. A card applies its template
 * with the template's default arguments: one request that pulls the data,
 * builds the widgets and writes one new section (`useApplyAnalysisTemplate`
 * handles what follows). The request is synchronous and slow, so the card
 * reads as building and every card, on either surface, stays inert until it
 * returns. The caller checks ownership: applying writes to the dashboard.
 */
export function AnalysisTemplateCards({
  dashboard,
  cards,
  compact = false,
  ...gridProps
}: {
  dashboard: Dashboard;
  cards: readonly AnalysisTemplateCard[];
  compact?: boolean;
} & GridProps) {
  const apply = useApplyAnalysisTemplate(dashboard.id);
  const pending = usePendingAnalysisTemplates(dashboard.id);
  // The template uses the dashboard's first area; without one the backend
  // answers 422, so the cards stay inert.
  const runnable = dashboard.aois.length > 0 && pending.length === 0;

  return (
    <Grid {...gridProps}>
      {cards.map((card) => (
        <TemplateCard
          key={card.name}
          card={card}
          compact={compact}
          status={
            pending.includes(card.name)
              ? "building"
              : runnable
                ? "idle"
                : "disabled"
          }
          onClick={() => apply.mutate(card.name)}
        />
      ))}
    </Grid>
  );
}

/**
 * The "Add an analysis template" block of the dashboard footer (Figma nodes
 * 3938:11841–3938:12209): a heading, the design's subtitle, then the cards.
 * Hidden when the registry lists none of them.
 */
export default function DashboardAnalysisTemplates({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const cards = useTemplateCards();

  if (cards.length === 0) return null;

  return (
    <Flex direction="column" gap="16px">
      <DashboardFooterHeading>Add an analysis template</DashboardFooterHeading>
      <Text fontSize="14px" lineHeight="1.5" color="#565E7B">
        {ANALYSIS_TEMPLATES_BLURB}
      </Text>
      <AnalysisTemplateCards
        dashboard={dashboard}
        cards={cards}
        mt="28px"
        templateColumns={`repeat(auto-fill, minmax(min(100%, ${MIN_CARD_WIDTH_PX}px), 1fr))`}
        columnGap="22px"
        rowGap="30px"
      />
    </Flex>
  );
}
