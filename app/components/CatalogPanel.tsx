import { useMemo, useState } from "react";
import { Box, Button, Flex, IconButton, Stack, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, StackPlusIcon, XIcon } from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";

import {
  ORDERED_DATASET_CARDS,
  DATASET_CATEGORIES,
  DATASET_CATEGORY_LABELS,
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
import { searchDatasets } from "@/app/utils/searchDatasets";
import { useEnabledFlags } from "@/src/shared/lib/feature-flags";

import { DatasetRow } from "./DatasetRow";
import { PanelEmpty, PanelList, PanelPills, PanelSection } from "./PanelList";
import { PanelSearchInput } from "./PanelSearchInput";

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
 * The legend reads from the same `mapStore.layers`, so any layer toggled here
 * appears there with its visibility and opacity controls.
 */
export default function DataCatalogPanel() {
  const [category, setCategory] = useState<DatasetCategoryId>("all");
  const { dataCatalogOpen, setDataCatalogOpen, isChatFullSize } =
    useSidebarStore();
  const leftPx = getCatalogLeftPx(isChatFullSize);

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
            <CatalogBody
              category={category}
              onCategoryChange={setCategory}
              onClose={() => setDataCatalogOpen(false)}
            />
          </Flex>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Search, category chips and the dataset list. Mounted only while the panel is
 * open, so the search query resets each time it opens (the chip persists).
 */
function CatalogBody({
  category,
  onCategoryChange,
  onClose,
}: {
  category: DatasetCategoryId;
  onCategoryChange: (category: DatasetCategoryId) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  // Datasets with a layer on the map — the layer manager is the source of
  // truth. `useShallow` keeps re-renders stable across unrelated layer changes
  // (e.g. AOI edits).
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
  const searched = useMemo(
    () =>
      searchDatasets(
        filterDatasetsByFeatureFlag(ORDERED_DATASET_CARDS, enabledFlags),
        query
      ),
    [enabledFlags, query]
  );
  const visible = filterDatasetsByCategory(searched, category);
  const active = new Set(activeDatasetIds);
  const onMap = visible.filter((c) => active.has(c.dataset_id));
  const rest = visible.filter((c) => !active.has(c.dataset_id));
  const categoryLabel = DATASET_CATEGORY_LABELS[category];

  return (
    <Flex
      flex={1}
      minH={0}
      minW={0}
      flexDirection="column"
      gap={3}
      pt={4}
      px={3}
      pb={6}
      overflow="hidden"
    >
      <PanelSearchInput
        label="Search datasets"
        placeholder="Search datasets, e.g. alerts or land cover"
        autoFocusOnDesktop
        value={query}
        onChange={setQuery}
        onEscapeEmpty={onClose}
      />
      <PanelPills
        options={DATASET_CATEGORIES}
        value={category}
        onChange={onCategoryChange}
      />
      <Stack
        gap={4}
        flex={1}
        minH={0}
        minW={0}
        pb={2}
        css={catalogListScrollStyle}
      >
        {visible.length === 0 ? (
          <CatalogEmptyState
            query={query.trim()}
            categoryLabel={categoryLabel}
            hitsInAll={category === "all" ? 0 : searched.length}
            onShowAll={() => onCategoryChange("all")}
          />
        ) : onMap.length === 0 ? (
          <CardList cards={rest} />
        ) : (
          <>
            <PanelSection label="On map">
              <CardList cards={onMap} onMap />
            </PanelSection>
            {rest.length > 0 && (
              <PanelSection label={categoryLabel}>
                <CardList cards={rest} />
              </PanelSection>
            )}
          </>
        )}
      </Stack>
    </Flex>
  );
}

function CardList({
  cards,
  onMap = false,
}: {
  cards: DatasetCardConfig[];
  onMap?: boolean;
}) {
  return (
    <PanelList>
      {cards.map((card) => (
        <CatalogDatasetRow key={card.dataset_id} card={card} onMap={onMap} />
      ))}
    </PanelList>
  );
}

function CatalogEmptyState({
  query,
  categoryLabel,
  hitsInAll,
  onShowAll,
}: {
  query: string;
  categoryLabel: string;
  /** Matches outside the selected category; 0 hides the "show all" offer. */
  hitsInAll: number;
  onShowAll: () => void;
}) {
  if (hitsInAll > 0) {
    return (
      <Stack gap={1} mt={4} align="flex-start">
        <Text fontSize="sm" color="fg.muted">
          No matches in {categoryLabel}.
        </Text>
        <Button
          variant="plain"
          size="sm"
          p={0}
          color="fg.link"
          onClick={onShowAll}
        >
          Show {hitsInAll} result{hitsInAll === 1 ? "" : "s"} in All datasets
        </Button>
      </Stack>
    );
  }
  return (
    <PanelEmpty>
      {query
        ? `No datasets match “${query}”.`
        : "No datasets in this category yet."}
    </PanelEmpty>
  );
}

/**
 * One dataset in the catalogue, with its supporting layers (if any) indented
 * beneath it. Opacity lives in the legend, which reads the same
 * `mapStore.layers`; at 0% it also hides the layer from the chat context
 * (`isLayerActive`), so a layer can be hidden there without the switch
 * rebuilding it from the card's defaults.
 */
function CatalogDatasetRow({
  card,
  onMap,
}: {
  card: DatasetCardConfig;
  /** Decided once by the panel, which also files this row under On map. */
  onMap: boolean;
}) {
  // Ids of every layer this card can put on the map (a single-layer card
  // synthesizes its one), derived by datasetLayerId — the same formula
  // buildDatasetLayers uses — so they match the ids actually on the map.
  const layerIds = (
    card.layers?.length ? card.layers : [{ name: card.dataset_name }]
  ).map((l, index) => datasetLayerId(card.dataset_id, index, l.name));

  // Which of this card's layers are on — only needed to mark the selected
  // supporting layer; whether the dataset is on at all is the `onMap` prop.
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
          checked: onMap,
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
