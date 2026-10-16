import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Stack,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, StackPlusIcon, XIcon } from "@phosphor-icons/react";
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
import { getCatalogLeftPx } from "@/app/explorationLayout";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { DatasetDetails } from "@/app/types/chat";
import {
  datasetCardLayers,
  selectDatasetCardLayer,
} from "@/app/utils/datasetCardLayerContext";
import { datasetLayerId } from "@/app/utils/datasetLayerContext";
import { filterDatasetsByCategory } from "@/app/utils/filterDatasetsByCategory";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";
import { useEnabledFlags } from "@/src/shared/lib/feature-flags";

import { DatasetRow } from "./DatasetRow";
import { PanelEmpty, PanelList } from "./PanelList";

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
                  <PanelEmpty>No datasets in this category yet.</PanelEmpty>
                ) : (
                  <PanelList>
                    {cards.map((card) => (
                      <CatalogDatasetRow key={card.dataset_id} card={card} />
                    ))}
                  </PanelList>
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
 * One dataset in the catalogue, with its supporting layers (if any) indented
 * beneath it. Visibility and opacity live in the legend, which reads the same
 * `mapStore.layers`.
 */
function CatalogDatasetRow({ card }: { card: DatasetCardConfig }) {
  // Ids of every layer this card can put on the map (a single-layer card
  // synthesizes its one), derived by datasetLayerId — the same formula
  // buildDatasetLayers uses — so they match the ids actually on the map.
  const layerIds = (
    card.layers?.length ? card.layers : [{ name: card.dataset_name }]
  ).map((l, index) => datasetLayerId(card.dataset_id, index, l.name));

  // The visible dataset layers IS the scope — the layer manager is the source
  // of truth for "is this dataset active?". Active if any of its layers are on.
  const activeLayerIds = useMapStore(
    useShallow((s) => {
      const ids = new Set(layerIds);
      return s.layers.filter((l) => ids.has(l.id)).map((l) => l.id);
    })
  );
  const addLayer = useMapStore((s) => s.addLayer);
  const removeDatasetLayers = useMapStore((s) => s.removeDatasetLayers);

  function handleToggle(checked: boolean) {
    if (!checked) {
      removeDatasetLayers(card.dataset_id);
      return;
    }
    datasetCardLayers(card).forEach(addLayer);
  }

  // layers[0] is the card's own default layer, shown above by the card's
  // own toggle; layers[1:] are "supporting layers" (e.g. LGMS's LULUCF/
  // agriculture) disclosed below as their own selectable rows, each with
  // its own info modal — PZB-1346 / project-zeno PR #830.
  const supportingLayers = (card.layers ?? []).slice(1).map((layer, i) => ({
    layer,
    layerId: layerIds[i + 1],
  }));
  const [supportingOpen, setSupportingOpen] = useState(true);

  return (
    <>
      <DatasetRow
        dataset={card}
        img={card.img}
        viewOnly={card.viewOnly}
        interaction={{
          mode: "toggle",
          checked: activeLayerIds.length > 0,
          onChange: handleToggle,
          dataPanel: "datasets",
        }}
      />
      {supportingLayers.length > 0 && (
        <Stack gap="6px" pl="16px">
          <Flex
            as="button"
            onClick={() => setSupportingOpen((o) => !o)}
            aria-expanded={supportingOpen}
            align="center"
            gap={2}
            py="2px"
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
            supportingLayers.map(({ layer, layerId }) => (
              <SupportingLayerRow
                key={layer.name}
                card={card}
                layer={layer}
                isSelected={activeLayerIds.includes(layerId)}
              />
            ))}
        </Stack>
      )}
    </>
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
  const addLayer = useMapStore((s) => s.addLayer);
  const removeDatasetLayers = useMapStore((s) => s.removeDatasetLayers);

  function handleToggle(checked: boolean) {
    removeDatasetLayers(card.dataset_id);
    if (checked) {
      selectDatasetCardLayer(card, layer.name).forEach(addLayer);
    }
  }

  const layerDataset: DatasetDetails = {
    dataset_name: layer.title ?? layer.name,
    summary: layer.summary,
    description: layer.description,
    cautions: layer.cautions,
    citation: layer.citation,
    cadence: layer.cadence ?? card.cadence,
    geographic_coverage: layer.geographic_coverage ?? card.geographic_coverage,
    provider: layer.provider ?? card.provider,
  };

  return (
    <DatasetRow
      dataset={layerDataset}
      img={layer.img}
      viewOnly
      interaction={{
        mode: "toggle",
        checked: isSelected,
        onChange: handleToggle,
        dataPanel: "datasets",
      }}
    />
  );
}
