"use client";
import { useState } from "react";
import { Flex, Button, Text, Badge } from "@chakra-ui/react";
import { SuggestedDataset } from "@/app/types/chat";
import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";
import { getDatasetLayerContextProps } from "@/app/utils/datasetLayerContext";

export default function DatasetNudgeWidget({
  datasets,
}: {
  datasets: SuggestedDataset[];
}) {
  const [pickedId, setPickedId] = useState<number | null>(null);

  const handlePick = (selected: SuggestedDataset) => {
    if (pickedId !== null) return;
    setPickedId(selected.dataset_id);

    // Merge backend-supplied fields (context_layer, dates) over local registry entry
    const localDataset = DATASET_BY_ID[selected.dataset_id];
    if (localDataset) {
      const merged = {
        ...localDataset,
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
    <Flex direction="column" gap={2} mt={1}>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color="fg.muted"
        letterSpacing="wider"
      >
        SUGGESTED
      </Text>
      <Flex gap={2} flexWrap="wrap">
        {datasets.map((d) => {
          const isPicked = pickedId === d.dataset_id;
          const isDisabled = pickedId !== null && !isPicked;
          return (
            <Button
              key={d.dataset_id}
              size="sm"
              variant={isPicked ? "solid" : "outline"}
              colorPalette={isPicked ? "primary" : "gray"}
              disabled={isDisabled}
              onClick={() => handlePick(d)}
            >
              {d.dataset_name}
              {d.recommended && (
                <Badge ml={1} size="xs" colorPalette="teal" variant="solid">
                  REC
                </Badge>
              )}
            </Button>
          );
        })}
      </Flex>
    </Flex>
  );
}
