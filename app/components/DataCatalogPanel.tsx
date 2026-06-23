"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Slider,
  Stack,
  Text,
  Wrap,
  useDisclosure,
} from "@chakra-ui/react";
import {
  CircleHalfIcon,
  EyeIcon,
  EyeSlashIcon,
  StackSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";

import {
  DATASET_CARDS,
  DATASET_CATEGORIES,
  type DatasetCardConfig,
  type DatasetCategoryId,
} from "@/app/constants/datasets";
import { chatPanelCardStyle } from "@/app/chatPanelShared";
import {
  DATA_CATALOG_CARD_WIDTH_PX,
  DATA_CATALOG_PANEL_WIDTH_PX,
  getDataCatalogLeftPx,
} from "@/app/explorationLayout";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { DatasetInfo } from "@/app/types/chat";
import { getLayerContextFromDatasetCard } from "@/app/utils/datasetCardLayerContext";
import { filterDatasetsByCategory } from "@/app/utils/filterDatasetsByCategory";

import { DataCatalogCard } from "./DataCatalogCard";
import { DatasetInfoModal } from "./DatasetInfoModal";
import { Tooltip } from "./ui/tooltip";

/** Scrollable list chrome: vertical scroll without visible scrollbars. */
const catalogListScrollStyle = {
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

/**
 * Slide-out panel that lets users browse the dataset catalogue and add or
 * remove layers from the map directly — without going through the chat agent.
 *
 * Wired into the exploration layout as a left-side column: flush left when the
 * chat panel is compact, and docked immediately to the right of the full-size
 * chat panel.
 *
 * Wiring:
 *  - Show-on-map switch ↔ `contextStore.addContext` / `removeContext` (the
 *    contextStore already drives `mapStore.addLayer` for dataset layers).
 *  - Visibility / opacity controls ↔ `mapStore.setLayerVisibility` and
 *    `setLayerOpacity` on `dataset-${dataset_id}`.
 *
 * The existing legend reads from the same `mapStore.layers`, so any layer
 * toggled here automatically appears in the legend with full functionality.
 */
export default function DataCatalogPanel() {
  const [category, setCategory] = useState<DatasetCategoryId>("all");
  const { dataCatalogOpen, setDataCatalogOpen, isChatFullSize } =
    useSidebarStore();
  const leftPx = getDataCatalogLeftPx(isChatFullSize);

  // Build the "in this conversation" set from the context store. `useShallow`
  // keeps re-renders stable across unrelated context changes (e.g. AOI edits).
  const activeDatasetIds = useContextStore(
    useShallow((s) =>
      s.context
        .filter(
          (c) => c.contextType === "layer" && typeof c.datasetId === "number"
        )
        .map((c) => c.datasetId as number)
    )
  );

  const cards = useMemo(
    () => filterDatasetsByCategory(DATASET_CARDS, category, activeDatasetIds),
    [category, activeDatasetIds]
  );

  if (!dataCatalogOpen) {
    return null;
  }

  return (
    <Flex
      position="absolute"
      top={0}
      bottom={0}
      left={`${leftPx}px`}
      w={`${DATA_CATALOG_PANEL_WIDTH_PX}px`}
      minW={`${DATA_CATALOG_PANEL_WIDTH_PX}px`}
      maxW={`${DATA_CATALOG_PANEL_WIDTH_PX}px`}
      flexShrink={0}
      zIndex={1095}
      flexDirection="column"
      pointerEvents="auto"
      display={{ base: "none", md: "flex" }}
      {...chatPanelCardStyle}
      borderLeftWidth={{ base: 0, md: isChatFullSize ? "1px" : 0 }}
      borderLeftColor="border.emphasized"
      borderRadius={{
        base: 0,
        md: isChatFullSize ? "0 sm sm 0" : "sm",
      }}
    >
      <Flex
        flexShrink={0}
        justifyContent="space-between"
        alignItems="center"
        px={3}
        pt={6}
        pb={3}
        gap={2}
      >
        <Flex align="center" gap={2} minW={0}>
          <StackSimpleIcon size={18} />
          <Text
            fontWeight="semibold"
            fontSize="xs"
            letterSpacing="0.08em"
            textTransform="uppercase"
            m={0}
          >
            Data catalog
          </Text>
        </Flex>
        <IconButton
          aria-label="Close data catalog"
          variant="ghost"
          size="xs"
          onClick={() => setDataCatalogOpen(false)}
        >
          <XIcon size={16} />
        </IconButton>
      </Flex>
      <Flex
        flex={1}
        minH={0}
        minW={0}
        flexDirection="column"
        gap={3}
        px={3}
        pb={6}
        overflow="hidden"
      >
        <Wrap gap={2} flexShrink={0} overflow="hidden">
          {DATASET_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              size="xs"
              variant={category === cat.id ? "solid" : "outline"}
              colorPalette="primary"
              borderRadius="full"
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </Wrap>
        <Stack
          gap={3}
          flex={1}
          minH={0}
          minW={0}
          pb={2}
          css={catalogListScrollStyle}
        >
          {cards.length === 0 ? (
            <Text fontSize="sm" color="fg.muted" mt={4}>
              No datasets in this category yet.
            </Text>
          ) : (
            cards.map((card) => (
              <DataCatalogCardRow key={card.dataset_id} card={card} />
            ))
          )}
        </Stack>
      </Flex>
    </Flex>
  );
}

/**
 * Single dataset row inside the catalogue: thumbnail + metadata + show-on-map
 * switch, with an expanded controls row (visibility + opacity slider) shown
 * only while the layer is on the map.
 */
function DataCatalogCardRow({ card }: { card: DatasetCardConfig }) {
  const {
    open: infoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();

  const ctx = useContextStore(
    useShallow((s) =>
      s.context.find(
        (c) => c.contextType === "layer" && c.datasetId === card.dataset_id
      )
    )
  );
  const addContext = useContextStore((s) => s.addContext);
  const removeContext = useContextStore((s) => s.removeContext);

  const layer = useMapStore(
    useShallow((s) =>
      s.layers.find((l) => l.id === `dataset-${card.dataset_id}`)
    )
  );
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const setLayerOpacity = useMapStore((s) => s.setLayerOpacity);

  const isActive = !!ctx;
  const isVisible = layer?.visible ?? true;
  const opacity = Math.round((layer?.opacity ?? 1) * 100);

  function handleToggle(checked: boolean) {
    if (!checked) {
      if (ctx) removeContext(ctx.id);
      return;
    }
    addContext({
      contextType: "layer",
      ...getLayerContextFromDatasetCard(card),
      isAiContext: false,
    });
  }

  const dataset = card as unknown as DatasetInfo;
  const cardText =
    [card.cadence, card.geographic_coverage, card.provider]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <Box w={`${DATA_CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <DatasetInfoModal
        isOpen={infoOpen}
        onClose={onInfoClose}
        dataset={dataset}
      />
      <DataCatalogCard
        thumbnail={
          <Image
            objectFit="cover"
            w="100%"
            h="100%"
            src={card.img ?? "/globe.svg"}
            alt={card.dataset_name}
          />
        }
        typeLabel={card.viewOnly ? "VIEW ONLY" : "DATA"}
        typeLabelColor={card.viewOnly ? "#656E7B" : "#1AA915"}
        title={card.dataset_name}
        description={cardText}
        selected={isActive}
        showOnMap={isActive}
        onShowOnMapChange={handleToggle}
        onInfoClick={onInfoOpen}
      />
      {isActive && layer && (
        <Flex
          align="center"
          gap={2}
          mt={1}
          px={2}
          py={2}
          w="100%"
          minW={0}
          bg="bg.subtle"
          borderRadius="4px"
          border="1px solid"
          borderColor="border"
        >
          <Tooltip
            content={isVisible ? "Hide layer" : "Show layer"}
            positioning={{ placement: "top" }}
            showArrow
            variant="dark"
          >
            <IconButton
              aria-label={
                isVisible
                  ? `Hide ${card.dataset_name} layer`
                  : `Show ${card.dataset_name} layer`
              }
              size="xs"
              variant="ghost"
              onClick={() => setLayerVisibility(layer.id, !isVisible)}
            >
              {isVisible ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />}
            </IconButton>
          </Tooltip>
          <CircleHalfIcon size={14} color="#656E7B" />
          <Slider.Root
            flex="1"
            minW={0}
            size="sm"
            value={[opacity]}
            min={0}
            max={100}
            onValueChange={(v: { value: number[] }) =>
              setLayerOpacity(layer.id, v.value[0] / 100)
            }
            // Chakra's Slider.Root expects string[] (one label per thumb);
            // this conflicts with jsx-a11y/aria-proptypes which expects a
            // plain string, so we suppress the lint rule for this prop.
            // eslint-disable-next-line jsx-a11y/aria-proptypes
            aria-label={[`${card.dataset_name} opacity`]}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
          <Text
            fontFamily="mono"
            fontSize="10px"
            color="fg.muted"
            w="4ch"
            textAlign="right"
          >
            {opacity}%
          </Text>
        </Flex>
      )}
    </Box>
  );
}
