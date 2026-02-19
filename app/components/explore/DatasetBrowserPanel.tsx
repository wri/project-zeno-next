"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";
import { sendGAEvent } from "@next/third-parties/google";

import useExplorePanelStore from "@/app/store/explorePanelStore";
import useContextStore from "@/app/store/contextStore";
import { DatasetCard } from "@/app/components/DatasetCard";
import { DATASET_CARDS } from "@/app/constants/datasets";
import ChatInput from "@/app/components/ChatInput";

// ---------------------------------------------------------------------------
// Topic mapping — DATASET_CARDS don't carry a category field so we map here
// ---------------------------------------------------------------------------
type Topic =
  | "Forest change"
  | "Land cover"
  | "Land use"
  | "Climate"
  | "Biodiversity";

const TOPICS: Topic[] = [
  "Forest change",
  "Land cover",
  "Land use",
  "Climate",
  "Biodiversity",
];

/** Maps dataset_id → topic(s). Datasets can appear under multiple topics. */
const DATASET_TOPIC_MAP: Record<number, Topic[]> = {
  0: ["Forest change"],               // DIST-ALERT
  1: ["Land cover"],                   // Global land cover
  2: ["Land cover", "Biodiversity"],   // Grassland extent
  3: ["Land cover", "Land use"],       // SBTN Natural Lands
  4: ["Forest change"],               // Tree cover loss
  5: ["Forest change"],               // Tree cover gain
  6: ["Climate", "Forest change"],    // GHG net flux
  7: ["Forest change"],               // Tree cover
  8: ["Forest change", "Land use"],   // Tree cover loss by driver
};

export default function DatasetBrowserPanel() {
  const { closePanel } = useExplorePanelStore();
  const { context, addContext, removeContext } = useContextStore();
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  // Derive which datasets are selected from context store
  const cards = useMemo(() => {
    return DATASET_CARDS.map((card) => {
      const isSelected = context.some(
        (ctx) => ctx.contextType === "layer" && ctx.datasetId === card.dataset_id
      );
      return { ...card, selected: isSelected };
    });
  }, [context]);

  // Filter by active topic
  const filteredCards = useMemo(() => {
    if (!activeTopic) return cards;
    return cards.filter((card) =>
      (DATASET_TOPIC_MAP[card.dataset_id] ?? []).includes(activeTopic)
    );
  }, [cards, activeTopic]);

  const handleToggleCard = (card: (typeof cards)[number]) => {
    const existingCtx = context.find(
      (ctx) => ctx.contextType === "layer" && ctx.datasetId === card.dataset_id
    );

    if (!card.selected) {
      sendGAEvent("event", "manual_layer_selected", {
        dataset_id: card.dataset_id,
        dataset_name: card.dataset_name,
      });
      addContext({
        contextType: "layer",
        content: card.dataset_name,
        datasetId: card.dataset_id,
        tileUrl: card.tile_url,
        layerName: card.dataset_name,
      });
    } else if (existingCtx) {
      removeContext(existingCtx.id);
    }
  };

  return (
    <Flex flexDir="column" h="100%" w="100%">
      {/* Header */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px={4}
        py={3}
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="border.muted"
      >
        <Heading size="sm" fontWeight="semibold" m={0}>
          Add to map
        </Heading>
        <IconButton
          size="sm"
          variant="ghost"
          color="fg.muted"
          onClick={closePanel}
          aria-label="Close panel"
        >
          <XIcon />
        </IconButton>
      </Flex>

      {/* Topic filter chips */}
      <Flex gap={2} px={4} py={3} flexWrap="wrap" flexShrink={0}>
        {TOPICS.map((topic) => (
          <Button
            key={topic}
            size="xs"
            variant={activeTopic === topic ? "solid" : "outline"}
            colorPalette={activeTopic === topic ? "primary" : undefined}
            onClick={() =>
              setActiveTopic((prev) => (prev === topic ? null : topic))
            }
            rounded="full"
          >
            {topic}
          </Button>
        ))}
      </Flex>

      {/* Dataset card grid */}
      <Box flex={1} overflowY="auto" px={4} pb={2}>
        {filteredCards.length === 0 ? (
          <Text color="fg.muted" fontSize="sm" py={4}>
            No datasets in this category.
          </Text>
        ) : (
          <SimpleGrid columns={1} gap={3}>
            {filteredCards.map((card) => (
              <DatasetCard
                key={card.dataset_id}
                dataset={{
                  dataset_id: card.dataset_id,
                  dataset_name: card.dataset_name,
                  description: card.description,
                  tile_url: card.tile_url ?? "",
                  context_layer: card.context_layer,
                }}
                img={card.img ?? "/globe.svg"}
                selected={card.selected}
                onClick={() => handleToggleCard(card)}
                size="sm"
              />
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Chat input at bottom */}
      <Box
        px={4}
        py={3}
        flexShrink={0}
        borderTop="1px solid"
        borderColor="border.muted"
      >
        <ChatInput />
      </Box>
    </Flex>
  );
}
