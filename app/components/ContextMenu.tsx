import { Suspense, useEffect, useMemo, useState } from "react";
import type { DatasetInfo } from "@/app/types/chat";
import {
  Box,
  Card,
  Stack,
  Field,
  Flex,
  Input,
  Dialog,
  Portal,
  Button,
  InputGroup,
  ButtonGroup,
} from "@chakra-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { format } from "date-fns";

import { ChatContextType, ChatContextOptions } from "./ContextButton";
import { DatePicker, DatePickerProps } from "./DatePicker";
import useContextStore from "../store/contextStore";
import { DatasetCard } from "./DatasetCard";

// Constants for navigation and dummy content
const CONTEXT_NAV = (Object.keys(ChatContextOptions) as ChatContextType[]).map(
  (type) => ({
    type,
    label: ChatContextOptions[type].label,
    icon: ChatContextOptions[type].icon,
  })
);

import { DATASET_CARDS, DatasetCardConfig } from "../constants/datasets";
import { useCustomAreasListSuspense } from "../hooks/useCustomAreasList";
import type { CustomArea } from "../schemas/api/custom_areas/get";
import useMapStore from "../store/mapStore";
import type { Feature, MultiPolygon } from "geojson";

const LAYER_CARDS = DATASET_CARDS;

function ContextNav({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (type: ChatContextType) => void;
}) {
  return (
    <Stack
      direction={{ base: "row", md: "column" }}
      bg="bg"
      flexShrink={0}
      gap={2}
      p={3}
      py={4}
      w={{ base: "full", md: "10rem" }}
      borderRightWidth={{ base: "none", md: "1px solid" }}
      borderRightColor="border.emphasized"
    >
      {CONTEXT_NAV.map((nav) => (
        <Button
          key={nav.type}
          size="xs"
          variant={selected === nav.type ? "subtle" : "ghost"}
          color={selected === nav.type ? "inherit" : "gray.500"}
          justifyContent="flex-start"
          onClick={() => onSelect(nav.type)}
        >
          {nav.icon}
          {nav.label}
        </Button>
      ))}
    </Stack>
  );
}

function LayerCardList({
  cards,
}: {
  cards: (DatasetCardConfig & { img?: string })[];
}) {
  const { context, upsertContextByType, removeContext } = useContextStore();

  function handleToggle(card: DatasetCardConfig & { img?: string }) {
    const existing = context.find(
      (c) => c.contextType === "layer" && c.datasetId === card.dataset_id
    );
    if (existing) {
      removeContext(existing.id);
    } else {
      const startYear = card.defaultStartYear;
      const endYear = card.defaultEndYear;
      // Only scope the layer when both bounds are present, so a half-configured
      // card falls back to the unfiltered tile_url rather than a broken range.
      const hasYears = startYear != null && endYear != null;
      const tileUrl =
        hasYears && card.tile_url
          ? `${card.tile_url}&start_year=${startYear}&end_year=${endYear}`
          : card.tile_url;
      upsertContextByType({
        contextType: "layer",
        content: card.dataset_name,
        datasetId: card.dataset_id,
        tileUrl,
        layerName: card.dataset_name,
        ...(hasYears
          ? {
              startDate: `${startYear}-01-01`,
              endDate: `${endYear}-12-31`,
            }
          : {}),
        isAiContext: false,
      });
    }
  }

  return (
    <Stack minH={0} overflowY="auto">
      {cards.map((card) => {
        const isSelected = context.some(
          (c) => c.contextType === "layer" && c.datasetId === card.dataset_id
        );
        return (
          <DatasetCard
            key={card.dataset_name}
            dataset={card as unknown as DatasetInfo}
            img={card.img ?? "/globe.svg"}
            selected={isSelected}
            onClick={() => handleToggle(card)}
            {...(card.viewOnly
              ? { label: "VIEW ONLY", labelColor: "#656E7B" }
              : {})}
          />
        );
      })}
    </Stack>
  );
}

function ContextMenu({
  contextType,
  open,
  onOpenChange,
}: {
  contextType: ChatContextType;
  open: boolean;
  onOpenChange: (e: { open: boolean }) => void;
}) {
  const [selectedContextType, setSelectedContextType] = useState(contextType);

  return (
    <Dialog.Root
      placement="bottom"
      motionPreset="slide-in-bottom"
      size={{ base: "xs", md: "lg" }}
      open={open}
      scrollBehavior="inside"
      onOpenChange={onOpenChange}
    >
      <Portal>
        <Dialog.Backdrop backdropFilter="blur(2px)" />
        <Dialog.Positioner zIndex={1500}>
          <Dialog.Content
            maxH="75vh"
            minH="30rem"
            overflow="hidden"
            mx={{ base: 2, md: "auto" }}
          >
            <Dialog.Body
              p={0}
              h="full"
              display="flex"
              flexDirection={{ base: "column", md: "row" }}
              minH={0}
            >
              {/* Modal Navigation */}
              <ContextNav
                selected={selectedContextType}
                onSelect={setSelectedContextType}
              />
              {/* Modal Body */}
              {selectedContextType === "layer" && <LayerMenu />}
              {selectedContextType === "area" && (
                <Suspense
                  fallback={
                    <Flex w="full" alignItems="center" justifyContent="center">
                      <Box color="fg.muted" fontSize="sm">
                        Loading areas…
                      </Box>
                    </Flex>
                  }
                >
                  <AreaMenu />
                </Suspense>
              )}
              {selectedContextType === "date" && <DateMenu />}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
export default ContextMenu;

export function LayerMenu() {
  const cards = LAYER_CARDS;

  return (
    <Stack bg="bg.subtle" pt={3} minW={0} w="100%">
      <Stack px={4} pt={3} borderTopWidth="1px" borderColor="border" minH={0}>
        <LayerCardList cards={cards} />
      </Stack>
    </Stack>
  );
}

function AreaCardList({
  cards,
  onCardClick,
}: {
  cards: { id: string; name: string; selected?: boolean }[];
  onCardClick?: (card: { id: string; name: string }) => void;
}) {
  return (
    <Stack>
      {cards.map((card) => (
        <Card.Root
          key={card.id}
          size="sm"
          flexDirection="row"
          overflow="hidden"
          maxW="xl"
          border={card.selected ? "2px solid" : undefined}
          borderColor={card.selected ? "primary.solid" : undefined}
          cursor={onCardClick ? "pointer" : undefined}
          onClick={
            onCardClick
              ? () => onCardClick({ id: card.id, name: card.name })
              : undefined
          }
        >
          <Card.Body>
            <Card.Title
              display="flex"
              gap="1"
              alignItems="center"
              fontSize="sm"
              m={0}
            >
              {card.name}
            </Card.Title>
          </Card.Body>
        </Card.Root>
      ))}
    </Stack>
  );
}

function AreaMenu() {
  const { customAreas } = useCustomAreasListSuspense();
  const { addToRegistry, addLayer, flyToGeoJsonWithRetry } = useMapStore();
  const { context, addContext } = useContextStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = (customAreas as unknown as CustomArea[] | undefined) ?? [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((a: CustomArea) => a.name.toLowerCase().includes(q));
  }, [customAreas, query]);

  const sorted = useMemo(() => {
    const list = filtered.sort(
      (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
    );
    return list;
  }, [filtered]);

  const cards = useMemo(
    () =>
      sorted.map((a) => {
        const isSelected = context.some(
          (c) =>
            c.contextType === "area" &&
            ((c.aoiData?.src_id &&
              c.aoiData.src_id === a.id &&
              c.aoiData.source === "custom") ||
              (typeof c.content === "string" && c.content === a.name))
        );
        return { id: a.id, name: a.name, selected: isSelected };
      }),
    [sorted, context]
  );

  const handleSelectArea = (area: { id: string; name: string }) => {
    // Areas stack — each selection is its own context item rendered as a chip.
    // The existing `cards` lookup prevents re-selecting the same area twice.
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

    // Build a single MultiPolygon Feature from the selected custom area's geometries
    const selected = (customAreas as unknown as CustomArea[] | undefined)?.find(
      (a) => a.id === area.id
    );
    if (selected) {
      const multi: MultiPolygon = {
        type: "MultiPolygon",
        coordinates: selected.geometries.map((poly) => poly.coordinates),
      };
      const feature: Feature = {
        type: "Feature",
        id: selected.id,
        geometry: multi,
        properties: { id: selected.id, name: selected.name },
      };
      addToRegistry({
        ref: { name: selected.name, source: "custom" },
        data: feature,
        srcId: selected.id,
        subtype: "custom-area",
      });
      addLayer({
        id: selected.id,
        name: selected.name,
        type: "geojson",
        visible: true,
        featureRefs: [{ name: selected.name, source: "custom" }],
      });
      flyToGeoJsonWithRetry(feature);
    }
  };

  return (
    <Stack bg="bg.subtle" py={3} w="full">
      <Flex px={4} gap={2}>
        <InputGroup endElement={<MagnifyingGlassIcon />}>
          <Input
            size="sm"
            bg="bg"
            type="text"
            placeholder="Find area by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </Flex>
      <Stack
        px={4}
        pt={3}
        borderTopWidth="1px"
        borderColor="border"
        h="full"
        overflow="auto"
      >
        {cards.length === 0 ? (
          <Box color="fg.muted" fontSize="sm">
            No custom areas found
          </Box>
        ) : (
          <AreaCardList cards={cards} onCardClick={handleSelectArea} />
        )}
      </Stack>
    </Stack>
  );
}

function DateMenu() {
  const [view, setView] = useState<DatePickerProps["view"]>("day");
  const handleViewChange = (newView: DatePickerProps["view"]) => {
    setView(newView);
  };

  const contextStore = useContextStore();

  const currentCtxDate = contextStore.context.find(
    (item) => item.contextType === "date"
  );
  // Start with context date if available, otherwise empty array.
  const [dateValue, setDateValue] = useState<Date[]>(
    currentCtxDate?.dateRange
      ? [currentCtxDate.dateRange.start, currentCtxDate.dateRange.end]
      : []
  );

  useEffect(() => {
    if (dateValue.length === 2) {
      // Remove previously set date.
      const ctxId = contextStore.context.find(
        (item) => item.contextType === "date"
      )?.id;
      if (ctxId) {
        contextStore.removeContext(ctxId);
      }
      contextStore.addContext({
        contextType: "date",
        content: `${format(dateValue[0], "yyyy-MM-dd")} — ${format(
          dateValue[1],
          "yyyy-MM-dd"
        )}`,
        dateRange: {
          start: dateValue[0],
          end: dateValue[1],
        },
      });
    }
    // No need to track changes in ContextStore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateValue]);

  return (
    <Stack
      direction={{ base: "column", md: "row" }}
      bg="bg.subtle"
      px={4}
      py={3}
      gap={8}
      w="full"
      flex={1}
      borderTopRightRadius="md"
      alignItems="center"
      justifyContent="center"
    >
      <Field.Root w="auto">
        <Field.Label fontWeight="normal" fontSize="xs">
          Date Resolution
        </Field.Label>
        <ButtonGroup attached size="xs">
          <Button
            variant={view === "year" ? "solid" : "outline"}
            colorPalette={view === "year" ? "primary" : undefined}
            onClick={() => handleViewChange("year")}
          >
            Year
          </Button>
          <Button
            variant={view === "month" ? "solid" : "outline"}
            colorPalette={view === "month" ? "primary" : undefined}
            onClick={() => handleViewChange("month")}
          >
            Month
          </Button>
          <Button
            variant={view === "day" ? "solid" : "outline"}
            colorPalette={view === "day" ? "primary" : undefined}
            onClick={() => handleViewChange("day")}
          >
            Day
          </Button>
        </ButtonGroup>
      </Field.Root>
      <DatePicker onChange={setDateValue} dateRange={dateValue} view={view} />
    </Stack>
  );
}
