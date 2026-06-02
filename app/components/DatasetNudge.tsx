"use client";
import { useState } from "react";
import { Flex, Text } from "@chakra-ui/react";
import { CheckIcon } from "@phosphor-icons/react";
import { SuggestedDataset } from "@/app/types/chat";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";
import { getDatasetLayerContextProps } from "@/app/utils/datasetLayerContext";

export default function DatasetNudge({
  datasets,
}: {
  datasets: SuggestedDataset[];
}) {
  const [pickedId, setPickedId] = useState<number | null>(null);

  const handlePick = (selected: SuggestedDataset) => {
    if (pickedId !== null) return;
    setPickedId(selected.dataset_id);

    const datasetMetadata = DATASET_BY_ID[selected.dataset_id];
    if (datasetMetadata) {
      const merged = {
        ...datasetMetadata,
        ...(selected.context_layer !== undefined && {
          context_layer: selected.context_layer,
        }),
        ...(selected.start_date && { start_date: selected.start_date }),
        ...(selected.end_date && { end_date: selected.end_date }),
        ...(selected.parameters && { parameters: selected.parameters }),
      };

      const layerContextProps = getDatasetLayerContextProps(merged);
      useContextStore.getState().upsertContextByType({
        contextType: "layer",
        content: merged.dataset_name,
        datasetId: merged.dataset_id,
        tileUrl: merged.tile_url,
        layerName: merged.dataset_name,
        ...layerContextProps,
        isAiContext: true,
      });
    }

    useChatStore.getState().sendMessage(selected.dataset_name, "human_input");
  };

  return (
    <Flex direction="column" gap={3} w="full">
      <Text fontSize="xs" color="fg.muted" lineHeight="18px">
        Pick one to continue and I&apos;ll run the analysis:
      </Text>
      <Flex direction="column" gap={3}>
        {datasets.map((d) => {
          const isPicked = pickedId === d.dataset_id;
          const isDisabled = pickedId !== null && !isPicked;
          return (
            <Flex
              key={d.dataset_id}
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
                  : d.recommended
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
              onClick={() => handlePick(d)}
            >
              <Flex direction="column" gap={1} flex={1} minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color={isPicked ? "primary.contrast" : "fg"}
                  lineHeight="16px"
                >
                  {d.dataset_name}
                </Text>
                {d.reason && (
                  <Text
                    fontSize="xs"
                    color={isPicked ? "primary.contrast" : "fg"}
                    lineHeight="16px"
                  >
                    {d.reason}
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
