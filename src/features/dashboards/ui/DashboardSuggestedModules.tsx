"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { SparkleIcon, TextTIcon, type Icon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import { usePromptQuota } from "@/app/hooks/usePromptQuota";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { SUGGESTED_PROMPT_MODULES } from "../lib/suggested-modules";
import { useAddTextWidget } from "./dashboardQueries";

// Fixed width for every card — deliberately not flex-grow. Rows pack as
// many as fit and wrap; a short last row leaves empty space rather than
// stretching its cards, so a card is always the same size regardless of how
// many others share its row or which surface (populated dashboard vs. the
// empty-state hero) is rendering it.
const CARD_WIDTH_PX = 168;
const CARD_HEIGHT_PX = 100;
const ANALYSIS_CARD_BG = "#F7FBD9";
const ANALYSIS_CARD_BORDER = "#C3D16F";
const NEUTRAL_CARD_BG = "#F4F5F6";
const NEUTRAL_CARD_BORDER = "#C2C7D0";
const CARD_LABEL_COLOR = "#0049AA";

function ModuleCard({
  icon: IconComponent,
  label,
  bg,
  borderColor,
  disabled,
  onClick,
}: {
  icon: Icon;
  label: string;
  bg: string;
  borderColor: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Flex
      as="button"
      aria-disabled={disabled}
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
      <IconComponent size={24} />
      <Text fontSize="sm" textAlign="center" lineHeight="1.2">
        {label}
      </Text>
    </Flex>
  );
}

/**
 * The "Suggested modules" row (Figma node 1475:4879), rendered below the
 * widget grid on every dashboard. The lime cards (SUGGESTED_PROMPT_MODULES)
 * inject a canned prompt into the existing chat pipeline — same MVP approach
 * as `runAnalysis`/`DashboardChatNudges` (see suggested-modules.ts). "Text
 * block" adds an empty note widget directly, no chat round-trip. "Describe
 * your own" just focuses the chat textarea, whose placeholder already reads
 * "Or describe what you want to explore…" once the thread is empty.
 *
 * Every card here writes to the dashboard — the prompts all end in "…add it
 * to the dashboard" — so the whole row is owner-only, and the cards that go
 * through the chat honour the same gates ChatInput's submitPrompt does.
 */
export default function DashboardSuggestedModules({
  dashboardId,
  isOwner,
  // Space above the divider. Callers that already provide their own gap
  // above this row (e.g. DashboardEmptyStateHero's hero copy) pass 0.
  mt = 8,
}: {
  dashboardId: string;
  isOwner: boolean;
  mt?: number;
}) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isLoading);
  const { promptsExhausted } = usePromptQuota();
  const requestChatInputFocus = useSidebarStore((s) => s.requestChatInputFocus);
  const addTextWidget = useAddTextWidget(dashboardId);

  // These cards are a second entry point into sendMessage, so they need the
  // guards submitPrompt applies to the textarea (ChatInput's `disabled` is the
  // same two conditions). Sending while a turn streams would clear the live
  // turn's tool steps and overwrite its abort controller in the store, leaving
  // the first request running but uncancellable; sending with no prompts left
  // just earns a generic "service unavailable". "Describe your own" is gated
  // too — under either condition the textarea it focuses is itself disabled.
  const chatDisabled = isStreaming || promptsExhausted;

  if (!isOwner) return null;

  return (
    // The chat panel this row drives is desktop-only for now (see the
    // ChatPanel mount in DashboardDetailPage), so on mobile every card but
    // "Text block" would post into a panel the user cannot see. Drop the row
    // until the mobile bottom sheet lands.
    <Flex
      direction="column"
      gap={5}
      mt={8}
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
