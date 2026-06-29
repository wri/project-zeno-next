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
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleHalfIcon,
  EyeIcon,
  EyeSlashIcon,
  StackPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";

import {
  DATASET_CARDS,
  DATASET_CATEGORIES,
  type DatasetCardConfig,
  type DatasetCategoryId,
} from "@/app/constants/datasets";
import {
  getCatalogColumnMotionStyle,
  getCatalogColumnPanelFlexProps,
} from "@/app/chatPanelShared";
import {
  CATALOG_CARD_WIDTH_PX,
  getCatalogLeftPx,
} from "@/app/explorationLayout";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { DatasetInfo } from "@/app/types/chat";
import { getLayerContextFromDatasetCard } from "@/app/utils/datasetCardLayerContext";
import { buildDatasetLayers } from "@/app/utils/datasetLayerContext";
import { filterDatasetsByCategory } from "@/app/utils/filterDatasetsByCategory";

import { CatalogCard } from "./CatalogCard";
import { DatasetInfoModal } from "./DatasetInfoModal";
import { Tooltip } from "./ui/tooltip";

/** Matches ChatPanel compact/full-size enter & exit (slide from the left). */
const catalogPanelSlideTransition = {
  duration: 0.2,
  ease: "easeInOut",
} as const;

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
 *  - Show-on-map switch ↔ `mapStore.addLayer` / `removeLayer` — the visible
 *    dataset layer IS the scope, so the layer manager is the source of truth.
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
  const leftPx = getCatalogLeftPx(isChatFullSize);

  // Build the "in this conversation" set from the visible dataset layers — the
  // layer manager is the source of truth. `useShallow` keeps re-renders stable
  // across unrelated layer changes (e.g. AOI edits).
  const activeDatasetIds = useMapStore(
    useShallow((s) =>
      s.layers
        .filter((l) => typeof l.datasetId === "number" && !l.parentLayerId)
        .map((l) => l.datasetId as number)
    )
  );

  const cards = useMemo(
    () => filterDatasetsByCategory(DATASET_CARDS, category, activeDatasetIds),
    [category, activeDatasetIds]
  );

  const compactSlide = !isChatFullSize;

  return (
    <AnimatePresence>
      {dataCatalogOpen && (
        <motion.div
          key="data-catalog-panel"
          initial={compactSlide ? { opacity: 0, x: -16 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={compactSlide ? { opacity: 0, x: -16 } : { opacity: 0 }}
          transition={catalogPanelSlideTransition}
          style={getCatalogColumnMotionStyle(leftPx)}
        >
          <Flex {...getCatalogColumnPanelFlexProps(isChatFullSize)}>
            <Flex
              flexShrink={0}
              h="40px"
              py="4px"
              px={3}
              justifyContent="space-between"
              alignItems="center"
              borderBottom="1px solid"
              borderColor="#E0E2E5"
            >
              <Flex alignItems="center" gap="8px" minW={0}>
                <StackPlusIcon size={16} color="#0049AA" />
                <Text
                  fontSize="10px"
                  fontWeight="400"
                  fontFamily="mono"
                  lineHeight="16px"
                  letterSpacing="0.03em"
                  textTransform="uppercase"
                  color="#656E7B"
                  m={0}
                >
                  Data catalog
                </Text>
              </Flex>
              <IconButton
                aria-label="Close data catalog"
                variant="ghost"
                size="2xs"
                p={0}
                minW="16px"
                h="16px"
                w="16px"
                color="#656E7B"
                onClick={() => setDataCatalogOpen(false)}
              >
                <XIcon size={12} />
              </IconButton>
            </Flex>
            <Flex
              flex={1}
              minH={0}
              minW={0}
              flexDirection="column"
              gap={4}
              pt={4}
              px={3}
              pb={6}
              overflow="hidden"
            >
              <Wrap gap={1} flexShrink={0} overflow="hidden">
                {DATASET_CATEGORIES.map((cat) => {
                  const isActive = category === cat.id;
                  return (
                    <Button
                      key={cat.id}
                      h="24px"
                      minH="24px"
                      py="4px"
                      px="8px"
                      borderRadius="full"
                      fontSize="12px"
                      fontWeight="400"
                      lineHeight="16px"
                      bg={isActive ? "fg.link" : "neutral.300"}
                      color={isActive ? "white" : "fg"}
                      border="1px solid"
                      borderColor={isActive ? "fg.link" : "neutral.300"}
                      _hover={{
                        bg: isActive ? "fg.link" : "neutral.400",
                      }}
                      onClick={() => setCategory(cat.id)}
                    >
                      {cat.label}
                    </Button>
                  );
                })}
              </Wrap>
              <Stack
                gap={4}
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
                    <CatalogCardRow key={card.dataset_id} card={card} />
                  ))
                )}
              </Stack>
            </Flex>
          </Flex>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Single dataset row inside the catalogue: thumbnail + metadata + show-on-map
 * switch, with an expanded controls row (visibility + opacity slider) shown
 * only while the layer is on the map.
 */
function CatalogCardRow({ card }: { card: DatasetCardConfig }) {
  const {
    open: infoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();

  // The visible dataset layers ARE the scope — the layer manager is the source
  // of truth for "is this dataset active?".
  const datasetLayers = useMapStore(
    useShallow((s) => s.layers.filter((l) => l.datasetId === card.dataset_id))
  );
  const layer = datasetLayers.find(
    (l) => l.id === `dataset-${card.dataset_id}`
  );
  const addLayer = useMapStore((s) => s.addLayer);
  const removeLayer = useMapStore((s) => s.removeLayer);
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const setLayerOpacity = useMapStore((s) => s.setLayerOpacity);

  const isActive = !!layer;
  const isVisible = layer?.visible ?? true;
  const opacity = Math.round((layer?.opacity ?? 1) * 100);

  function handleToggle(checked: boolean) {
    if (!checked) {
      // Remove the dataset layer and any context sub-layers.
      datasetLayers.forEach((l) => removeLayer(l.id));
      return;
    }
    buildDatasetLayers(getLayerContextFromDatasetCard(card)).forEach(addLayer);
  }

  const dataset = card as unknown as DatasetInfo;
  const cardText =
    [card.cadence, card.geographic_coverage, card.provider]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <DatasetInfoModal
        isOpen={infoOpen}
        onClose={onInfoClose}
        dataset={dataset}
      />
      <CatalogCard
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
