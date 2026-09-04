"use client";

import { useMemo, type ReactNode } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  SparkleIcon,
  SpinnerGapIcon,
  TextTIcon,
  type Icon,
} from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import { toaster } from "@/app/components/ui/toaster";
import { usePromptQuota } from "@/app/hooks/usePromptQuota";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
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
  type CuratedSuggestedModule,
} from "../lib/suggested-modules";
import { useAddTextWidget } from "./dashboardQueries";
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
 * The "Suggested modules" row (Figma node 1475:4879), rendered below the
 * widget grid on every dashboard and inside the empty-state hero. The lime
 * cards are `SUGGESTED_MODULES`: the curated ones run a deterministic analysis
 * for the dashboard's area and add it directly; the prompt ones inject a
 * canned prompt into the chat pipeline (same MVP approach as `runAnalysis` /
 * `DashboardChatNudges`). "Text block" adds an empty note widget directly, no
 * chat round-trip. "Describe your own" just focuses the chat textarea, whose
 * placeholder already reads "Or describe what you want to explore…" once the
 * thread is empty.
 *
 * Every card here writes to the dashboard, so the whole row is owner-only,
 * and the cards that go through the chat honour the same gates ChatInput's
 * submitPrompt does. `service` is injectable for tests.
 */
export default function DashboardSuggestedModules({
  dashboard,
  isOwner,
  // Space above the divider. Callers that already provide their own gap
  // above this row (e.g. DashboardEmptyStateHero's hero copy) pass 0.
  mt = 8,
  service,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  mt?: number;
  service?: AnalysisService;
}) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isLoading);
  const { promptsExhausted } = usePromptQuota();
  const requestChatInputFocus = useSidebarStore((s) => s.requestChatInputFocus);
  const addTextWidget = useAddTextWidget(dashboard.id);
  // Resolved lazily so a catalogue drift throws at render, not at module load.
  const specById = useMemo(
    () => new Map(curatedCatalogue().map((s) => [s.datasetId, s])),
    []
  );

  // The prompt cards are a second entry point into sendMessage, so they need
  // the guards submitPrompt applies to the textarea (ChatInput's `disabled` is
  // the same two conditions). Sending while a turn streams would clear the
  // live turn's tool steps and overwrite its abort controller in the store,
  // leaving the first request running but uncancellable; sending with no
  // prompts left just earns a generic "service unavailable". "Describe your
  // own" is gated too — under either condition the textarea it focuses is
  // itself disabled. Curated tiles and "Text block" are direct REST calls and
  // ignore these gates.
  const chatDisabled = isStreaming || promptsExhausted;

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

  if (!isOwner) return null;

  return (
    // The chat panel this row drives is desktop-only for now (see the
    // ChatPanel mount in DashboardDetailPage), so on mobile every card but
    // "Text block" would post into a panel the user cannot see. Drop the row
    // until the mobile bottom sheet lands.
    <Flex
      direction="column"
      gap={5}
      mt={mt}
      display={{ base: "none", md: "flex" }}
    >
      <Flex align="center" gap={3}>
        <Box flex={1} h="1px" bg="#E0E2E5" />
        <Text fontSize="xs" fontStyle="italic" color="#656E7B" flexShrink={0}>
          Suggested modules
        </Text>
        <Box flex={1} h="1px" bg="#E0E2E5" />
      </Flex>
      <Flex wrap="wrap" gap="20px">
        {CURATED_SUGGESTED_MODULES.map((module) => {
          const spec = specById.get(module.datasetId);
          if (!spec) {
            throw new Error(
              `Suggested module ${module.id} names dataset ${module.datasetId}, which is not in the curated catalogue`
            );
          }
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
        <ModuleCard
          icon={TextTIcon}
          label="Text block"
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
          icon={SparkleIcon}
          label="Describe your own via the chat"
          bg={NEUTRAL_CARD_BG}
          borderColor={NEUTRAL_CARD_BORDER}
          disabled={chatDisabled}
          onClick={requestChatInputFocus}
        />
      </Flex>
    </Flex>
  );
}
