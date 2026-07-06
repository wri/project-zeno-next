"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Stack,
  Text,
  Wrap,
  useDisclosure,
} from "@chakra-ui/react";
import { StackPlusIcon, XIcon } from "@phosphor-icons/react";

import { chatPanelCardStyle } from "@/app/chatPanelShared";
import { CatalogCard } from "@/app/components/CatalogCard";
import { DatasetInfoModal } from "@/app/components/DatasetInfoModal";
import {
  DATASET_BY_ID,
  DATASET_CARDS,
  DATASET_CATEGORIES,
  type DatasetCardConfig,
  type DatasetCategoryId,
} from "@/app/constants/datasets";
import { useAddWidget, useRemoveWidget } from "@/app/hooks/useDashboards";
import {
  datasetToMapWidgetConfig,
  findDatasetWidgetId,
} from "@/app/lib/dashboard-widgets";
import type { Dashboard } from "@/app/schemas/api/dashboards/get";
import useComposerStore from "@/app/store/composerStore";
import { filterDatasetsByCategory } from "@/app/utils/filterDatasetsByCategory";

/**
 * The "Datasets" side panel on a dashboard: the same static catalog the map
 * page browses, but the toggle adds/removes a self-contained dataset map
 * widget on the dashboard (plain widget POST/DELETE — no chat round trip, no
 * map involved). View-only catalog entries (no tile_url) can't be added.
 */
export default function DashboardDatasetsPanel({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const closeSidePane = useComposerStore((s) => s.closeSidePane);
  const addWidget = useAddWidget(dashboard.id);
  const removeWidget = useRemoveWidget(dashboard.id);
  const [category, setCategory] = useState<DatasetCategoryId>("all");

  // Dataset ids already snapshotted as map widgets on this dashboard.
  const activeDatasetIds = useMemo(
    () =>
      dashboard.widgets
        .filter((w) => w.widget_type === "map")
        .map((w) => w.config?.dataset?.dataset_id)
        .filter((id): id is number => typeof id === "number"),
    [dashboard.widgets]
  );

  const cards = useMemo(
    () => filterDatasetsByCategory(DATASET_CARDS, category, activeDatasetIds),
    [category, activeDatasetIds]
  );

  const busy = addWidget.isPending || removeWidget.isPending;

  const toggle = (card: DatasetCardConfig, checked: boolean) => {
    if (!checked) {
      const widgetId = findDatasetWidgetId(dashboard, card.dataset_id);
      if (widgetId) removeWidget.mutate(widgetId);
      return;
    }
    const config = datasetToMapWidgetConfig(DATASET_BY_ID[card.dataset_id]);
    if (config) addWidget.mutate({ widget_type: "map", config });
  };

  return (
    <Flex
      flexDir="column"
      h="100%"
      w="full"
      {...chatPanelCardStyle}
      borderRadius={0}
      borderWidth={0}
    >
      {/* Header */}
      <Flex
        h="40px"
        px="3"
        bg="#F4F5F6"
        borderBottomWidth="1px"
        borderColor="#E7E6E6"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Flex align="center" gap={2}>
          <StackPlusIcon size={16} color="#0049AA" />
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            letterSpacing="0.3px"
            textTransform="uppercase"
            color="#656E7B"
          >
            Data catalog
          </Text>
        </Flex>
        <IconButton
          aria-label="Close data catalog"
          size="2xs"
          variant="ghost"
          color="#656E7B"
          onClick={closeSidePane}
        >
          <XIcon size={14} />
        </IconButton>
      </Flex>

      {/* Category chips */}
      <Wrap gap={1} flexShrink={0} px={3} pt={3}>
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
              _hover={{ bg: isActive ? "fg.link" : "neutral.400" }}
              onClick={() => setCategory(cat.id)}
            >
              {/* "In this conversation" reads wrong here — the active set is
                  what's on the dashboard. */}
              {cat.id === "in-conversation" ? "On this dashboard" : cat.label}
            </Button>
          );
        })}
      </Wrap>

      {/* Cards */}
      <Stack gap={4} flex="1 1 auto" minH={0} overflowY="auto" p={3} pb={6}>
        {cards.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" mt={4}>
            No datasets in this category yet.
          </Text>
        ) : (
          cards.map((card) => (
            <DatasetCardRow
              key={card.dataset_id}
              card={card}
              onDashboard={activeDatasetIds.includes(card.dataset_id)}
              disabled={busy || !card.tile_url}
              onToggle={(checked) => toggle(card, checked)}
            />
          ))
        )}
      </Stack>
    </Flex>
  );
}

function DatasetCardRow({
  card,
  onDashboard,
  disabled,
  onToggle,
}: {
  card: DatasetCardConfig;
  onDashboard: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const {
    open: infoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();

  const cardText =
    [card.cadence, card.geographic_coverage, card.provider]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <Box w="100%" flexShrink={0} opacity={!card.tile_url ? 0.6 : 1}>
      <DatasetInfoModal
        isOpen={infoOpen}
        onClose={onInfoClose}
        dataset={DATASET_BY_ID[card.dataset_id]}
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
        selected={onDashboard}
        showOnMap={onDashboard}
        onShowOnMapChange={disabled ? () => {} : onToggle}
        toggleLabel="Add to dashboard"
        onInfoClick={onInfoOpen}
      />
    </Box>
  );
}
