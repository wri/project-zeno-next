"use client";
import { useState } from "react";
import { Flex, Text } from "@chakra-ui/react";
import { CheckIcon } from "@phosphor-icons/react";
import { Nudge } from "@/app/types/chat";
import useChatStore from "@/app/store/chatStore";
import {
  addSuggestedDatasetToMap,
  datasetChoiceEntry,
} from "@/app/utils/nudgeDataset";

/**
 * Renders a nudge — the agent asking the user to pick one of several options.
 * The accompanying question text arrives as a normal assistant message; this
 * is only the option row under it. Clicking an option submits that exact
 * string as the user's next chat message.
 *
 * Any nudge type renders as a vertical stack of option buttons. dataset_choice
 * options backed by a valid `data` entry additionally show the dataset's
 * reason and (for the top-ranked option, index 0) a recommended highlight —
 * and, on pick, optimistically add the dataset's layers to the map.
 */
export default function ChatNudge({ nudge }: { nudge: Nudge }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePick = (index: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);

    const dataset = datasetChoiceEntry(nudge, index);
    if (dataset) addSuggestedDatasetToMap(dataset);

    useChatStore.getState().sendMessage(nudge.options[index], "human_input");
  };

  return (
    <Flex direction="column" gap={3} w="full">
      {nudge.type === "dataset_choice" && (
        <Text fontSize="xs" color="fg.muted" lineHeight="18px">
          Pick one to continue and I&apos;ll run the analysis:
        </Text>
      )}
      <Flex direction="column" gap={3}>
        {nudge.options.map((option, index) => {
          const dataset = datasetChoiceEntry(nudge, index);
          const isRecommended = !!dataset && index === 0;
          const isPicked = selectedIndex === index;
          const isDisabled = selectedIndex !== null && !isPicked;
          return (
            <Flex
              key={`${index}-${option}`}
              align="center"
              gap={2}
              w="full"
              px={3}
              py={2}
              bg={isPicked ? "primary.500" : "bg.panel"}
              border="1px solid"
              borderColor={
                isPicked
                  ? "primary.500"
                  : isRecommended
                    ? "primary.emphasized"
                    : "neutral.400"
              }
              borderRadius="lg"
              cursor={isDisabled ? "default" : "pointer"}
              opacity={isDisabled ? 0.4 : 1}
              pointerEvents={isDisabled ? "none" : "auto"}
              transition="border-color 0.15s ease"
              _hover={
                !isDisabled && !isPicked
                  ? { borderColor: "primary.emphasized" }
                  : undefined
              }
              onClick={() => handlePick(index)}
            >
              <Flex direction="column" gap={1} flex={1} minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color={isPicked ? "primary.contrast" : "fg"}
                  lineHeight="16px"
                >
                  {option}
                </Text>
                {dataset?.reason && (
                  <Text
                    fontSize="xs"
                    color={isPicked ? "primary.contrast" : "fg"}
                    lineHeight="16px"
                  >
                    {dataset.reason}
                  </Text>
                )}
              </Flex>
              {isPicked && (
                <CheckIcon
                  size={16}
                  weight="bold"
                  color="var(--chakra-colors-primary-contrast)"
                  style={{ flexShrink: 0 }}
                />
              )}
            </Flex>
          );
        })}
      </Flex>
    </Flex>
  );
}
