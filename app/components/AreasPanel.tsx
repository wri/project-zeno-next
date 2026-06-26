"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Menu,
  Portal,
  Stack,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CrosshairIcon,
  DotsThreeVerticalIcon,
  PolygonIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";
import type { Feature, MultiPolygon } from "geojson";

import {
  getCatalogColumnMotionStyle,
  getCatalogColumnPanelFlexProps,
} from "@/app/chatPanelShared";
import {
  CATALOG_CARD_WIDTH_PX,
  getCatalogLeftPx,
} from "@/app/explorationLayout";
import { useCustomAreasListSuspense } from "@/app/hooks/useCustomAreasList";
import { useCustomAreasCreate } from "@/app/hooks/useCustomAreasCreate";
import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import useContextStore, { type ContextItem } from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

import { CatalogCard } from "./CatalogCard";
import { AreaToolbarButtons } from "./AreaToolbarButtons";
import { AreaCatalogThumbnail } from "./AreaCatalogThumbnail";
import { Tooltip } from "./ui/tooltip";
import type { AOISelection } from "@/app/types/chat";

/** Matches CatalogPanel compact/full-size enter & exit (slide from the left). */
const areasPanelSlideTransition = {
  duration: 0.2,
  ease: "easeInOut",
} as const;

/** Scrollable list chrome: vertical scroll without visible scrollbars. */
const areasListScrollStyle = {
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

const AREA_TYPE_LABELS: Record<string, string> = {
  gadm: "Administrative areas",
  kba: "Key biodiversity areas",
  wdpa: "Protected areas",
  landmark: "Indigenous territories",
  custom: "User uploaded areas",
};

const AREA_LABEL_COLOR = "#2D6BE4";
const AREA_SELECTED_BG = "rgba(45, 107, 228, 0.06)";

type AreaFilter = "conversation" | "monitored";

const AREA_FILTERS: { id: AreaFilter; label: string }[] = [
  { id: "conversation", label: "In this conversation" },
  { id: "monitored", label: "Monitored areas" },
];

/**
 * Slide-out panel for selecting and managing Areas of Interest (AOIs). Lives
 * in the same exploration-layout column as `CatalogPanel` (datasets) and is
 * mutually exclusive with it via `sidebarStore`.
 *
 * Wiring:
 *  - "In this conversation" — read from `contextStore.context` (filtered to
 *    `contextType === "area"`). Show-on-map toggle controls the corresponding
 *    map layer's `visible` flag via `mapStore.setLayerVisibility`.
 *  - "Monitored areas" — `useCustomAreasListSuspense().customAreas`. Toggling
 *    show-on-map adds the area to the conversation context (and registers the
 *    geometry on the map) or removes it again.
 *  - Header actions delegate to existing `mapStore` actions:
 *    select-on-map (`setSelectAreaLayer` / `setSelectionMode`), upload
 *    (`toggleUploadAreaDialog`), draw (`startDrawing`).
 */
export default function AreasPanel() {
  const [filter, setFilter] = useState<AreaFilter>("conversation");
  const { areasPanelOpen, setAreasPanelOpen, isChatFullSize } =
    useSidebarStore();
  const setCreateAreaFn = useMapStore((s) => s.setCreateAreaFn);
  const { createAreaAsync } = useCustomAreasCreate();

  useEffect(() => {
    setCreateAreaFn(createAreaAsync);
  }, [createAreaAsync, setCreateAreaFn]);

  const leftPx = getCatalogLeftPx(isChatFullSize);

  const compactSlide = !isChatFullSize;

  return (
    <AnimatePresence>
      {areasPanelOpen && (
        <motion.div
          key="areas-panel"
          initial={compactSlide ? { opacity: 0, x: -16 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={compactSlide ? { opacity: 0, x: -16 } : { opacity: 0 }}
          transition={areasPanelSlideTransition}
          style={getCatalogColumnMotionStyle(leftPx)}
        >
          <Flex {...getCatalogColumnPanelFlexProps(isChatFullSize)}>
            <AreasPanelHeader onClose={() => setAreasPanelOpen(false)} />
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
                {AREA_FILTERS.map((f) => {
                  const isActive = filter === f.id;
                  return (
                    <Button
                      key={f.id}
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
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
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
                css={areasListScrollStyle}
              >
                {filter === "conversation" ? (
                  <ConversationAreasList />
                ) : (
                  <Suspense
                    fallback={
                      <Text fontSize="sm" color="fg.muted" mt={4}>
                        Loading monitored areas…
                      </Text>
                    }
                  >
                    <MonitoredAreasList />
                  </Suspense>
                )}
              </Stack>
            </Flex>
          </Flex>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AreasPanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <Flex
      position="relative"
      zIndex={10}
      flexShrink={0}
      h="40px"
      py="4px"
      px={3}
      justifyContent="space-between"
      alignItems="center"
      borderBottom="1px solid"
      borderColor="#E0E2E5"
      overflow="hidden"
      minW={0}
    >
      <Flex alignItems="center" gap="8px" minW={0} flex="1" overflow="hidden">
        <PolygonIcon size={16} color={AREA_LABEL_COLOR} />
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
          Areas
        </Text>
      </Flex>
      <Flex alignItems="center" gap="12px">
        <AreaToolbarButtons />

        <Box w="1px" h="16px" bg="#E0E2E5" flexShrink={0} />

        <IconButton
          aria-label="Close areas panel"
          variant="ghost"
          size="2xs"
          p={0}
          minW="16px"
          h="16px"
          w="16px"
          color="#656E7B"
          onClick={onClose}
        >
          <XIcon size={12} />
        </IconButton>
      </Flex>
    </Flex>
  );
}

/** Type label string ("Administrative areas" etc.) derived from an area context item. */
function getAreaTypeLabel(item: ContextItem): string {
  const source =
    item.aoiData?.source ?? item.aoiSelection?.aois[0]?.source ?? "";
  const label = AREA_TYPE_LABELS[source.toLowerCase()] ?? source;
  return label || "Area";
}

/** Display name for an area context item. */
function getAreaTitle(item: ContextItem): string {
  if (item.aoiSelection?.name) return item.aoiSelection.name;
  if (item.aoiData?.name) return item.aoiData.name;
  if (typeof item.content === "string") return item.content;
  return "Area";
}

function contextItemToAoiSelection(item: ContextItem): AOISelection | null {
  if (item.aoiSelection) return item.aoiSelection;
  if (!item.aoiData) return null;
  return {
    name: item.aoiData.name,
    aois: [
      {
        name: item.aoiData.name,
        src_id: item.aoiData.src_id ?? item.aoiData.name,
        source: item.aoiData.source ?? "",
        subtype: item.aoiData.subtype ?? "",
      },
    ],
  };
}

/**
 * Pick the map layer for an area context item by trying the same id candidates
 * `contextStore.removeContext` uses — different add-area call sites pick
 * different conventions for `layer.id`.
 */
function getLayerIdForArea(
  item: ContextItem,
  layerIds: Set<string>
): string | undefined {
  const candidates = [
    item.aoiData?.src_id,
    item.aoiData?.name,
    item.aoiSelection?.name,
    typeof item.content === "string" ? item.content : undefined,
  ];
  for (const id of candidates) {
    if (id && layerIds.has(id)) return id;
  }
  return undefined;
}

function ConversationAreasList() {
  const areaItems = useContextStore(
    useShallow((s) => s.context.filter((c) => c.contextType === "area"))
  );

  if (areaItems.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted" mt={4}>
        No areas selected yet. Use the tools above to pick, upload, or draw an
        area — or ask the assistant to find one for you.
      </Text>
    );
  }

  return (
    <>
      {areaItems.map((item) => (
        <ConversationAreaCard key={item.id} item={item} />
      ))}
    </>
  );
}

function ConversationAreaCard({ item }: { item: ContextItem }) {
  const layerIds = useMapStore(
    useShallow((s) => new Set(s.layers.map((l) => l.id)))
  );
  const layer = useMapStore(
    useShallow((s) => {
      const id = getLayerIdForArea(item, new Set(s.layers.map((l) => l.id)));
      return id ? s.layers.find((l) => l.id === id) : undefined;
    })
  );
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const flyToGeoJson = useMapStore((s) => s.flyToGeoJson);
  const flyToBounds = useMapStore((s) => s.flyToBounds);
  const geoJsonRegistry = useMapStore((s) => s.geoJsonRegistry);
  const removeContext = useContextStore((s) => s.removeContext);

  const layerId = getLayerIdForArea(item, layerIds);
  const isVisible = layer?.visible ?? false;
  const aoiSelection = useMemo(() => contextItemToAoiSelection(item), [item]);
  const title = getAreaTitle(item);

  function handleToggle(checked: boolean) {
    if (!layerId) return;
    setLayerVisibility(layerId, checked);
  }

  function handleLocate() {
    const bbox = item.aoiSelection?.aois[0]?.bbox;
    if (bbox) {
      let east = bbox[2];
      if (east > 180) east -= 360;
      flyToBounds([
        [bbox[0], bbox[1]],
        [east, bbox[3]],
      ]);
      return;
    }
    // Fallback: look up the geometry by registry ref
    const candidates = [
      item.aoiData?.name,
      item.aoiSelection?.aois[0]?.name,
    ].filter((n): n is string => !!n);
    for (const name of candidates) {
      const entry = geoJsonRegistry.find((e) => e.ref.name === name);
      if (entry) {
        flyToGeoJson(entry.data);
        return;
      }
    }
    if (item.aoiSelection?.aois[0]?.geometry) {
      flyToGeoJson(item.aoiSelection.aois[0].geometry);
    }
  }

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={
          aoiSelection ? (
            <AreaCatalogThumbnail aoiSelection={aoiSelection} alt={title} />
          ) : undefined
        }
        typeLabel="AREA"
        typeLabelColor={AREA_LABEL_COLOR}
        title={title}
        description={getAreaTypeLabel(item)}
        selected={isVisible}
        selectedBg={AREA_SELECTED_BG}
        showOnMap={isVisible}
        onShowOnMapChange={handleToggle}
        titleActions={
          <AreaCardActions
            onLocate={handleLocate}
            onRemove={() => removeContext(item.id)}
          />
        }
      />
    </Box>
  );
}

function MonitoredAreasList() {
  const { customAreas } = useCustomAreasListSuspense();
  const areaContext = useContextStore(
    useShallow((s) => s.context.filter((c) => c.contextType === "area"))
  );

  const sorted = useMemo(() => {
    return [...customAreas].sort(
      (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
    );
  }, [customAreas]);

  if (sorted.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted" mt={4}>
        No monitored areas yet. Upload or draw an area to save it here.
      </Text>
    );
  }

  return (
    <>
      {sorted.map((area) => (
        <MonitoredAreaCard
          key={area.id}
          area={area}
          contextItem={areaContext.find(
            (c) =>
              c.aoiData?.src_id === area.id && c.aoiData.source === "custom"
          )}
        />
      ))}
    </>
  );
}

function MonitoredAreaCard({
  area,
  contextItem,
}: {
  area: CustomArea;
  contextItem: ContextItem | undefined;
}) {
  const addContext = useContextStore((s) => s.addContext);
  const removeContext = useContextStore((s) => s.removeContext);
  const addToRegistry = useMapStore((s) => s.addToRegistry);
  const addLayer = useMapStore((s) => s.addLayer);
  const removeLayer = useMapStore((s) => s.removeLayer);
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const flyToGeoJsonWithRetry = useMapStore((s) => s.flyToGeoJsonWithRetry);
  const layer = useMapStore(
    useShallow((s) => s.layers.find((l) => l.id === area.id))
  );

  const isInContext = !!contextItem;
  const isVisible = layer?.visible ?? false;

  function buildFeature(): Feature {
    const multi: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: area.geometries.map((poly) => poly.coordinates),
    };
    return {
      type: "Feature",
      id: area.id,
      geometry: multi,
      properties: { id: area.id, name: area.name },
    };
  }

  const feature = useMemo(() => buildFeature(), [area]);
  const aoiSelection = useMemo(
    (): AOISelection => ({
      name: area.name,
      aois: [
        {
          name: area.name,
          src_id: area.id,
          source: "custom",
          subtype: "custom-area",
        },
      ],
    }),
    [area]
  );

  function handleToggle(checked: boolean) {
    if (checked) {
      if (!isInContext) {
        // Mirror the AreaMenu / UploadAreaDialog flow: register geometry,
        // add a layer with id = area.id, and add an area context item.
        const feature = buildFeature();
        addToRegistry({
          ref: { name: area.name, source: "custom" },
          data: feature,
          srcId: area.id,
          subtype: "custom-area",
        });
        addLayer({
          id: area.id,
          name: area.name,
          type: "geojson",
          visible: true,
          featureRefs: [{ name: area.name, source: "custom" }],
        });
        addContext({
          contextType: "area",
          content: area.name,
          aoiData: {
            src_id: area.id,
            name: area.name,
            source: "custom",
            subtype: "custom-area",
          },
        });
        flyToGeoJsonWithRetry(feature);
        return;
      }
      // Already in conversation but hidden — just re-show it.
      if (layer && !layer.visible) {
        setLayerVisibility(area.id, true);
      }
      return;
    }
    // Toggle OFF on a monitored card removes it from the conversation entirely.
    // (Visibility-only hiding is available from the "In this conversation" tab.)
    if (contextItem) {
      removeContext(contextItem.id);
    } else if (layer) {
      removeLayer(area.id);
    }
  }

  function handleLocate() {
    const feature = buildFeature();
    flyToGeoJsonWithRetry(feature);
  }

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={
          <AreaCatalogThumbnail
            aoiSelection={aoiSelection}
            alt={area.name}
            geometry={feature}
          />
        }
        typeLabel="AREA"
        typeLabelColor={AREA_LABEL_COLOR}
        title={area.name}
        description={AREA_TYPE_LABELS.custom}
        selected={isVisible}
        selectedBg={AREA_SELECTED_BG}
        showOnMap={isVisible}
        onShowOnMapChange={handleToggle}
        titleActions={
          isVisible ? (
            <AreaCardActions
              onLocate={handleLocate}
              onRemove={
                contextItem ? () => removeContext(contextItem.id) : undefined
              }
            />
          ) : undefined
        }
      />
    </Box>
  );
}

function AreaCardActions({
  onLocate,
  onRemove,
}: {
  onLocate: () => void;
  onRemove?: () => void;
}) {
  const compactIconProps = {
    variant: "ghost" as const,
    color: AREA_LABEL_COLOR,
    boxSize: "16px",
    minW: "16px",
    maxW: "16px",
    minH: "16px",
    maxH: "16px",
    p: 0,
    css: {
      "& svg": {
        width: "16px",
        height: "16px",
      },
    },
  };

  return (
    <Flex align="center" gap="16px" flexShrink={0} h="16px">
      <Tooltip
        content="Center on map"
        positioning={{ placement: "top" }}
        showArrow
        variant="dark"
      >
        <IconButton
          aria-label="Center on map"
          {...compactIconProps}
          onClick={(e) => {
            e.stopPropagation();
            onLocate();
          }}
        >
          <CrosshairIcon size={16} color={AREA_LABEL_COLOR} />
        </IconButton>
      </Tooltip>
      {onRemove && (
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <IconButton
              aria-label="More area actions"
              {...compactIconProps}
              onClick={(e) => e.stopPropagation()}
            >
              <DotsThreeVerticalIcon size={16} color={AREA_LABEL_COLOR} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="remove" onClick={onRemove}>
                  Remove from conversation
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
    </Flex>
  );
}
