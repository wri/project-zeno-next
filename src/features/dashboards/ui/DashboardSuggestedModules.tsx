"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { SparkleIcon, TextTIcon, type Icon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { SUGGESTED_PROMPT_MODULES } from "../lib/suggested-modules";
import { useAddTextWidget } from "./dashboardQueries";

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
      h={`${CARD_HEIGHT_PX}px`}
      px={5}
      flexShrink={0}
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
 */
export default function DashboardSuggestedModules({
  dashboardId,
  isOwner,
}: {
  dashboardId: string;
  isOwner: boolean;
}) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const requestChatInputFocus = useSidebarStore((s) => s.requestChatInputFocus);
  const addTextWidget = useAddTextWidget(dashboardId);

  return (
    <Flex direction="column" gap={5} mt={8}>
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
            onClick={() => void sendMessage(card.prompt)}
          />
        ))}
        {isOwner && (
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
        )}
        <ModuleCard
          icon={SparkleIcon}
          label="Describe your own"
          bg={NEUTRAL_CARD_BG}
          borderColor={NEUTRAL_CARD_BORDER}
          onClick={requestChatInputFocus}
        />
      </Flex>
    </Flex>
  );
}
