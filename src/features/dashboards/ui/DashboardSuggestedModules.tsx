"use client";

import { useMemo, type ReactNode } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  RowsPlusBottomIcon,
  SpinnerGapIcon,
  TextTIcon,
  type Icon,
} from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import { toaster } from "@/app/components/ui/toaster";
import { usePromptQuota } from "@/app/hooks/usePromptQuota";
import useChatStore from "@/app/store/chatStore";
import { useEnabledFlags } from "@/src/shared/lib/feature-flags";
import {
  curatedCatalogue,
  type AnalysisService,
  type CuratedAnalysisSpec,
} from "@/src/features/analysis";
import type { Dashboard } from "../api/schemas";
import {
  CURATED_SUGGESTED_MODULES,
  curatedTileStatus,
  SUGGESTED_PROMPT_MODULES,
  SUMMARISE_DASHBOARD_MODULE,
  type CuratedSuggestedModule,
} from "../lib/suggested-modules";
import DashboardFooterHeading from "./DashboardFooterHeading";
import { useAddSection, useAddTextWidget } from "./dashboardQueries";
import { scrollToSectionWhenRendered } from "./scrollToSection";
import {
  useAddCuratedAnalysisToDashboard,
  type AddCuratedAnalysisOutcome,
} from "./useAddCuratedAnalysisToDashboard";
import type { CurrentDashboardArea } from "./useCurrentDashboardArea";

// Fixed width for every card — deliberately not flex-grow. Rows pack as
// many as fit and wrap; a short last row leaves empty space rather than
// stretching its cards, so a card is always the same size regardless of how
// many others share its row or which surface (populated dashboard vs. the
// empty-state hero) is rendering it. The height fits icon, label and the
// caption line the curated cards carry.
const CARD_WIDTH_PX = 168;
const CARD_HEIGHT_PX = 112;
const ANALYSIS_CARD_BG = "#F7FBD9";
const ANALYSIS_CARD_BORDER = "#C3D16F";
const NEUTRAL_CARD_BG = "#F4F5F6";
const NEUTRAL_CARD_BORDER = "#C2C7D0";
const CARD_LABEL_COLOR = "#0049AA";
// The heading the backend requires (1–100 characters) for a section the owner
// has not named yet.
const NEW_SECTION_TITLE = "New section";

/** Toast per run-then-add outcome; the tile itself has no room for state copy. */
const OUTCOME_TOASTS: Partial<
  Record<
    AddCuratedAnalysisOutcome,
    { title: string; description: string; type: "warning" | "error" }
  >
> = {
  unavailable: {
    title: "Not available for this area right now",
    description:
      "The analysis couldn't be produced for this area. Try again in a moment.",
    type: "warning",
  },
  "no-data": {
    title: "No data for this area",
    description: "The analysis ran but produced no charts for this area.",
    type: "warning",
  },
  error: {
    title: "Couldn't run this analysis",
    description: "Please try again.",
    type: "error",
  },
};

function ModuleCard({
  icon: IconComponent,
  iconNode,
  label,
  caption,
  bg,
  borderColor,
  disabled,
  title,
  onClick,
}: {
  icon: Icon;
  /** Replaces the module icon (a spinner while running, a check once added). */
  iconNode?: ReactNode;
  label: string;
  /** Small line under the label: the CURATED badge, or a status. */
  caption?: ReactNode;
  bg: string;
  borderColor: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Flex
      as="button"
      // The label alone names the control; the caption (CURATED, a status) is
      // presentational and must not change the accessible name.
      aria-label={label}
      aria-disabled={disabled}
      title={title}
      onClick={disabled ? undefined : onClick}
      direction="column"
      align="center"
      justify="center"
      gap={2}
      w={`${CARD_WIDTH_PX}px`}
      flexShrink={0}
      h={`${CARD_HEIGHT_PX}px`}
      px={5}
      bg={bg}
      borderWidth="1px"
      borderStyle="dashed"
      borderColor={borderColor}
      borderRadius="sm"
      color={CARD_LABEL_COLOR}
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? "not-allowed" : "pointer"}
      transition="border-color 0.15s ease"
      _hover={disabled ? undefined : { borderColor: CARD_LABEL_COLOR }}
    >
      {iconNode ?? <IconComponent size={24} />}
      <Text fontSize="sm" textAlign="center" lineHeight="1.2">
        {label}
      </Text>
      {caption}
    </Flex>
  );
}

function RunningIcon() {
  return (
    <Box
      display="flex"
      alignItems="center"
      animation="spin 1s infinite"
      animationTimingFunction="steps(8, end)"
      aria-hidden
    >
      <SpinnerGapIcon size={24} />
    </Box>
  );
}

function StatusCaption({ children }: { children: ReactNode }) {
  return (
    <Text
      fontSize="10px"
      fontFamily="mono"
      lineHeight="16px"
      letterSpacing="0.03em"
      color="#656E7B"
      whiteSpace="nowrap"
    >
      {children}
    </Text>
  );
}

/**
 * A curated tile: runs the analysis for the dashboard's area and adds the
 * result through the same `useAddCuratedAnalysisToDashboard` flow as the
 * Analyses pane's Curated cards (loading module on the grid at once, widget
 * on completion). Inert, but still shown, once its analysis is on the
 * dashboard; runs regardless of the chat's streaming/quota gates, which do
 * not apply to a direct analytics call.
 */
function CuratedModuleTile({
  module,
  spec,
  area,
  service,
}: {
  module: CuratedSuggestedModule;
  spec: CuratedAnalysisSpec;
  area: CurrentDashboardArea;
  service?: AnalysisService;
}) {
  const curated = useAddCuratedAnalysisToDashboard(spec, area, service);
  const status = curatedTileStatus(curated.added, curated.busy);

  const run = async () => {
    const outcome = await curated.addNow();
    const toast = OUTCOME_TOASTS[outcome];
    if (toast) toaster.create({ ...toast, duration: 5000 });
  };

  return (
    <ModuleCard
      icon={module.icon}
      iconNode={
        status === "pending" ? (
          <RunningIcon />
        ) : status === "on-dashboard" ? (
          <CheckCircleIcon size={24} />
        ) : undefined
      }
      label={module.label}
      caption={
        status === "on-dashboard" ? (
          <StatusCaption>On dashboard</StatusCaption>
        ) : status === "pending" ? (
          <StatusCaption>Running...</StatusCaption>
        ) : (
          <InsightCaption curated showLearnMore={false} />
        )
      }
      bg={ANALYSIS_CARD_BG}
      borderColor={ANALYSIS_CARD_BORDER}
      disabled={status !== "idle"}
      title={
        status === "on-dashboard" ? "Already on this dashboard" : undefined
      }
      onClick={() => void run()}
    />
  );
}

/**
 * The "More suggested modules" block of the dashboard footer (Figma node
 * 3938:11934), under the analysis templates. The lime row is
 * `SUGGESTED_MODULES`: the curated cards run a deterministic analysis for the
 * dashboard's area and add it directly; the prompt ones inject a canned prompt
 * into the chat pipeline (same MVP approach as `runAnalysis` /
 * `DashboardChatNudges`). The grey row under it holds the non-analysis cards:
 * "Summarize this dashboard" (a prompt too), "Add a text block" (an empty note
 * widget, no chat round-trip) and "Create new section" (an empty section,
 * likewise direct).
 *
 * Every card here writes to the dashboard, so the whole block is owner-only,
 * and the cards that go through the chat honour the same gates ChatInput's
 * submitPrompt does. `service` is injectable for tests.
 */
export default function DashboardSuggestedModules({
  dashboard,
  isOwner,
  service,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  service?: AnalysisService;
}) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isLoading);
  const { promptsExhausted } = usePromptQuota();
  const enabledFlags = useEnabledFlags();
  const addTextWidget = useAddTextWidget(dashboard.id);
  const addSection = useAddSection(dashboard.id);

  // The prompt cards are a second entry point into sendMessage, so they need
  // the guards submitPrompt applies to the textarea (ChatInput's `disabled` is
  // the same two conditions). Sending while a turn streams would clear the
  // live turn's tool steps and overwrite its abort controller in the store,
  // leaving the first request running but uncancellable; sending with no
  // prompts left just earns a generic "service unavailable". Curated tiles,
  // "Add a text block" and "Create new section" are direct REST calls and
  // ignore these gates.
  const chatDisabled = isStreaming || promptsExhausted;

  // mutateAsync rather than mutate's callbacks: on an empty dashboard the new
  // section swaps the hero for the grid, unmounting this row before
  // mutate-level callbacks would run.
  const createSection = async () => {
    try {
      const sectionId = await addSection.mutateAsync(NEW_SECTION_TITLE);
      if (sectionId) scrollToSectionWhenRendered(sectionId);
    } catch (error) {
      toaster.create({
        title: "Couldn't create a section",
        description:
          error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 4000,
      });
    }
  };

  // A dashboard is scoped to exactly one AOI; without it (never in practice)
  // the curated tiles have nothing to analyse and render inert.
  const aoi = dashboard.aois[0];
  const area: CurrentDashboardArea | null = aoi
    ? {
        aoiSource: aoi.source,
        aoiId: aoi.src_id,
        subtype: aoi.subtype,
        name: aoi.name,
      }
    : null;

  // Resolved lazily so a catalogue drift throws at render, not at module load.
  // Gated by the URL flags and this dashboard's area, so a tile whose analysis
  // is not offered here resolves to nothing and is dropped below.
  const specById = useMemo(
    () =>
      new Map(
        curatedCatalogue({
          enabledFlags,
          aoiSource: area?.aoiSource,
        }).map((s) => [s.datasetId, s])
      ),
    [enabledFlags, area?.aoiSource]
  );

  if (!isOwner) return null;

  return (
    // The chat panel these cards drive is desktop-only for now (see the
    // ChatPanel mount in DashboardDetailPage), so on mobile every card but
    // "Add a text block" and "Create new section" would post into a panel the
    // user cannot see. Drop the block until the mobile bottom sheet lands.
    <Flex direction="column" gap="40px" display={{ base: "none", md: "flex" }}>
      <DashboardFooterHeading>More suggested modules</DashboardFooterHeading>
      <Flex direction="column" gap="20px">
        <Flex wrap="wrap" gap="20px">
          {CURATED_SUGGESTED_MODULES.map((module) => {
            // No spec means the catalogue does not offer this analysis here (a
            // feature flag that is off, an area its dataset does not cover), so
            // the tile is not rendered at all.
            const spec = specById.get(module.datasetId);
            if (!spec) return null;
            return area ? (
              <CuratedModuleTile
                key={module.id}
                module={module}
                spec={spec}
                area={area}
                service={service}
              />
            ) : (
              <ModuleCard
                key={module.id}
                icon={module.icon}
                label={module.label}
                caption={<InsightCaption curated showLearnMore={false} />}
                bg={ANALYSIS_CARD_BG}
                borderColor={ANALYSIS_CARD_BORDER}
                disabled
                onClick={() => {}}
              />
            );
          })}
          {SUGGESTED_PROMPT_MODULES.map((card) => (
            <ModuleCard
              key={card.id}
              icon={card.icon}
              label={card.label}
              bg={ANALYSIS_CARD_BG}
              borderColor={ANALYSIS_CARD_BORDER}
              disabled={chatDisabled}
              onClick={() => void sendMessage(card.prompt)}
            />
          ))}
        </Flex>
        <Flex wrap="wrap" gap="20px">
          <ModuleCard
            icon={SUMMARISE_DASHBOARD_MODULE.icon}
            label={SUMMARISE_DASHBOARD_MODULE.label}
            bg={NEUTRAL_CARD_BG}
            borderColor={NEUTRAL_CARD_BORDER}
            disabled={chatDisabled}
            onClick={() => void sendMessage(SUMMARISE_DASHBOARD_MODULE.prompt)}
          />
          <ModuleCard
            icon={TextTIcon}
            label="Add a text block"
            bg={NEUTRAL_CARD_BG}
            borderColor={NEUTRAL_CARD_BORDER}
            disabled={addTextWidget.isPending}
            onClick={() =>
              addTextWidget.mutate(undefined, {
                onError: (error) =>
                  toaster.create({
                    title: "Couldn't add text block",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    type: "error",
                    duration: 4000,
                  }),
              })
            }
          />
          <ModuleCard
            icon={RowsPlusBottomIcon}
            label="Create new section"
            bg={NEUTRAL_CARD_BG}
            borderColor={NEUTRAL_CARD_BORDER}
            disabled={addSection.isPending}
            onClick={() => void createSection()}
          />
        </Flex>
      </Flex>
    </Flex>
  );
}
