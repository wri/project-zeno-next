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
  CaretDownIcon,
  CircleHalfIcon,
  EyeIcon,
  EyeSlashIcon,
  StackPlusIcon,
  StackSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";

import {
  ORDERED_DATASET_CARDS,
  DATASET_CATEGORIES,
  type DatasetCardConfig,
  type DatasetCardLayer,
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
import {
  datasetCardLayers,
  selectDatasetCardLayer,
} from "@/app/utils/datasetCardLayerContext";
import { datasetLayerId } from "@/app/utils/datasetLayerContext";
import { filterDatasetsByCategory } from "@/app/utils/filterDatasetsByCategory";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";
import { useEnabledFlags } from "@/src/shared/lib/feature-flags";

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

  // Flag-gated cards are hidden from the catalogue until their flag is on.
  // Safe to branch on here: the panel only renders once the user opens it, so
  // the flagged list never differs between the server render and hydration.
  const enabledFlags = useEnabledFlags();
  const cards = useMemo(
    () =>
      filterDatasetsByCategory(
        filterDatasetsByFeatureFlag(ORDERED_DATASET_CARDS, enabledFlags),
        category,
        activeDatasetIds
      ),
    [category, activeDatasetIds, enabledFlags]
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

  // Single-layer cards fall back to a synthesized one-entry list so this
  // stays a uniform "N layers" loop with no dataset-identity branching. Ids
  // are derived by datasetLayerId — the same formula buildDatasetLayers uses
  // — so a card's rows always match the ids actually on the map.
  const layerRefs = (
    card.layers?.length ? card.layers : [{ name: card.dataset_name }]
  ).map((l, index) => ({
    name: l.name,
    id: datasetLayerId(card.dataset_id, index, l.name),
  }));

  // The visible dataset layers IS the scope — the layer manager is the source
  // of truth for "is this dataset active?". Active if any of its layers are on.
  const activeLayerIds = useMapStore(
    useShallow((s) => {
      const ids = new Set(layerRefs.map((r) => r.id));
      return s.layers.filter((l) => ids.has(l.id)).map((l) => l.id);
    })
  );
  const addLayer = useMapStore((s) => s.addLayer);
  const removeDatasetLayers = useMapStore((s) => s.removeDatasetLayers);

  const isActive = activeLayerIds.length > 0;

  function handleToggle(checked: boolean) {
    if (!checked) {
      removeDatasetLayers(card.dataset_id);
      return;
    }
    datasetCardLayers(card).forEach(addLayer);
  }

  const dataset = card as unknown as DatasetInfo;
  const cardText =
    [card.cadence, card.geographic_coverage, card.provider]
      .filter(Boolean)
      .join(" · ") || undefined;

  // layers[0] is the card's own default layer, shown above by the card's
  // own toggle; layers[1:] are "supporting layers" (e.g. LGMS's LULUCF/
  // agriculture) disclosed below as their own selectable rows, each with
  // its own info modal — PZB-1346 / project-zeno PR #830.
  const supportingLayers = (card.layers ?? []).slice(1).map((layer, i) => ({
    layer,
    ref: layerRefs[i + 1],
  }));
  const [supportingOpen, setSupportingOpen] = useState(true);

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <DatasetInfoModal
        isOpen={infoOpen}
        onClose={onInfoClose}
        dataset={dataset}
      />
      <CatalogCard
        thumbnail={
          card.img ? (
            <Image
              objectFit="cover"
              w="100%"
              h="100%"
              src={card.img}
              alt={card.dataset_name}
            />
          ) : (
            <Flex
              w="100%"
              h="100%"
              align="center"
              justify="center"
              bg="gray.50"
            >
              <StackSimpleIcon size={32} color="#656E7B" />
            </Flex>
          )
        }
        typeLabel={card.viewOnly ? "VIEW ONLY" : "DATA"}
        typeLabelColor={card.viewOnly ? "#656E7B" : "#1AA915"}
        title={card.dataset_name}
        description={cardText}
        selected={isActive}
        showOnMap={isActive}
        onShowOnMapChange={handleToggle}
        onInfoClick={onInfoOpen}
        dataPanel="datasets"
      />
      {isActive &&
        layerRefs.map((ref) => (
          <LayerControlsRow
            key={ref.id}
            layerId={ref.id}
            // Only label sub-rows when there's more than one layer to
            // disambiguate — a single-layer dataset's row stays unlabeled.
            label={layerRefs.length > 1 ? ref.name : card.dataset_name}
          />
        ))}
      {supportingLayers.length > 0 && (
        <Box
          mt={1}
          borderRadius="4px"
          overflow="hidden"
          border="1px solid"
          borderColor="rgba(19, 22, 25, 0.1)"
        >
          <Flex
            as="button"
            onClick={() => setSupportingOpen((o) => !o)}
            align="center"
            gap={2}
            w="100%"
            px={4}
            py="10px"
            bg="#FAFBFC"
          >
            <Box
              transform={supportingOpen ? "rotate(180deg)" : undefined}
              transition="transform 0.15s ease"
              display="flex"
            >
              <CaretDownIcon size={12} color="#3A4048" />
            </Box>
            <Text
              fontFamily="body"
              fontWeight="medium"
              fontSize="12px"
              color="#3A4048"
            >
              {supportingLayers.length} supporting layer
              {supportingLayers.length === 1 ? "" : "s"}
            </Text>
            <Text fontFamily="mono" fontSize="10px" color="#656E7B">
              — view only
            </Text>
          </Flex>
          {supportingOpen &&
            supportingLayers.map(({ layer, ref }) => (
              <SupportingLayerRow
                key={layer.name}
                card={card}
                layer={layer}
                isSelected={activeLayerIds.includes(ref.id)}
              />
            ))}
        </Box>
      )}
    </Box>
  );
}

/** One "supporting layer" row: its own thumbnail, info modal, and toggle —
 * turning it on swaps the card's single visible layer to this one. */
function SupportingLayerRow({
  card,
  layer,
  isSelected,
}: {
  card: DatasetCardConfig;
  layer: DatasetCardLayer;
  isSelected: boolean;
}) {
  const {
    open: infoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();
  const addLayer = useMapStore((s) => s.addLayer);
  const removeDatasetLayers = useMapStore((s) => s.removeDatasetLayers);

  function handleToggle(checked: boolean) {
    removeDatasetLayers(card.dataset_id);
    if (checked) {
      selectDatasetCardLayer(card, layer.name).forEach(addLayer);
    }
  }

  const title = layer.title ?? layer.name;
  const resolved = {
    cadence: layer.cadence ?? card.cadence,
    resolution: layer.resolution ?? card.resolution,
    geographic_coverage: layer.geographic_coverage ?? card.geographic_coverage,
    provider: layer.provider ?? card.provider,
  };
  const layerDataset = {
    dataset_id: card.dataset_id,
    dataset_name: title,
    tile_url: layer.tile_url,
    summary: layer.summary,
    description: layer.description,
    cautions: layer.cautions,
    citation: layer.citation,
    ...resolved,
  } as unknown as DatasetInfo;
  const layerText =
    [resolved.cadence, resolved.geographic_coverage, resolved.provider]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <Flex borderTop="1px solid" borderColor="rgba(19, 22, 25, 0.1)">
      <Box w="4px" flexShrink={0} bg={isSelected ? "#8EA5EA" : "#E0E2E5"} />
      <Box flex="1" minW={0}>
        <DatasetInfoModal
          isOpen={infoOpen}
          onClose={onInfoClose}
          dataset={layerDataset}
        />
        <CatalogCard
          thumbnail={
            layer.img ? (
              <Image
                objectFit="cover"
                w="100%"
                h="100%"
                src={layer.img}
                alt={title}
              />
            ) : (
              <Flex
                w="100%"
                h="100%"
                align="center"
                justify="center"
                bg="gray.50"
              >
                <StackSimpleIcon size={32} color="#656E7B" />
              </Flex>
            )
          }
          typeLabel="DATA"
          typeLabelColor="#1AA915"
          badge={
            <Box
              bg={isSelected ? "#C2CCF2" : "#F4F5F6"}
              borderRadius="4px"
              px="5px"
              py="2px"
            >
              <Text
                fontFamily="mono"
                fontSize="9px"
                color={isSelected ? "#172B7A" : "#3A4048"}
              >
                VIEW ONLY
              </Text>
            </Box>
          }
          title={title}
          description={layerText}
          selected={isSelected}
          selectedBg="#F0F4FF"
          showOnMap={isSelected}
          onShowOnMapChange={handleToggle}
          onInfoClick={onInfoOpen}
          dataPanel="datasets"
        />
      </Box>
    </Flex>
  );
}

/** Visibility + opacity controls for one map layer, shown while it's active. */
function LayerControlsRow({
  layerId,
  label,
}: {
  layerId: string;
  label: string;
}) {
  const layer = useMapStore(
    useShallow((s) => s.layers.find((l) => l.id === layerId))
  );
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const setLayerOpacity = useMapStore((s) => s.setLayerOpacity);

  if (!layer) return null;

  const isVisible = layer.visible;
  const opacity = Math.round((layer.opacity ?? 1) * 100);

  return (
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
          aria-label={isVisible ? `Hide ${label} layer` : `Show ${label} layer`}
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
        aria-label={[`${label} opacity`]}
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
  );
}
