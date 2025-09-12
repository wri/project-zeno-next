import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Stack,
  Field,
  Flex,
  Dialog,
  Portal,
  Input,
  Badge,
  Button,
  InputGroup,
  ButtonGroup,
} from "@chakra-ui/react";
import {
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
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

const LAYER_TAGS = [
  { label: "Recent", selected: true },
  { label: "Forest Change" },
  { label: "Land Cover" },
  { label: "Land Use" },
  { label: "Climate" },
  { label: "Biodiversity" },
];

import { DATASET_CARDS } from "../constants/datasets";
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
      direction="column"
      bg="bg"
      flexShrink={0}
      gap={2}
      p={3}
      py={4}
      w="10rem"
      borderRight="1px solid"
      borderColor="border"
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

type LayerCardItem = {
  dataset_id: number;
  dataset_name: string;
  context_layer: string | null;
  img?: string;
  description: string;
  tile_url: string;
  selected?: boolean;
  reason?: string;
};

function LayerCardList({
  cards,
  onCardClick,
}: {
  cards: LayerCardItem[];
  onCardClick?: (card: LayerCardItem) => void;
}) {
  return (
    <Stack minH={0} overflowY="auto">
      {cards.map((card) => (
        <DatasetCard
          key={card.dataset_name}
          dataset={card}
          img={card.img ?? "/globe.svg"}
          selected={card.selected}
          onClick={onCardClick ? () => onCardClick(card) : undefined}
        />
      ))}
    </Stack>
  );
}

function TagList({ tags }: { tags: { label: string; selected?: boolean }[] }) {
  return (
    <Flex gap="2" maxW="100%" overflow="auto" flexShrink={0}>
      {tags.map((tag) => (
        <Button
          key={tag.label}
          size="xs"
          h={6}
          borderRadius="full"
          colorPalette={tag.selected ? "primary" : undefined}
          variant={tag.selected ? undefined : "outline"}
        >
          {tag.label}
        </Button>
      ))}
    </Flex>
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
  const selectedItems = 0;

  return (
    <Dialog.Root
      placement="bottom"
      motionPreset="slide-in-bottom"
      size="lg"
      open={open}
      scrollBehavior="inside"
      onOpenChange={onOpenChange}
    >
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content maxH="75vh" minH="30rem">
            <Dialog.Body
              p={0}
              h="full"
              display="flex"
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
            <Dialog.Footer
              justifyContent="space-between"
              borderTop="1px solid"
              borderColor="border"
              py={2}
              px={3}
            >
              <Badge size="sm" borderRadius="full">
                {/* Update with count of selected items */}
                {selectedItems ? selectedItems : "No items"} selected{" "}
              </Badge>
              <Button
                size="xs"
                variant="ghost"
                borderRadius="full"
                colorPalette="primary"
                ml="auto"
                disabled={!selectedItems}
              >
                Clear all
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
export default ContextMenu;

export function LayerMenu() {
  const { context, addContext, removeContext } = useContextStore();

  // Compute selected state from context so cards reflect external context changes
  const cards: LayerCardItem[] = useMemo(() => {
    return LAYER_CARDS.map((c) => {
      const isSelected = context.some(
        (ctx) => ctx.contextType === "layer" && ctx.datasetId === c.dataset_id
      );
      return { ...c, selected: isSelected } as LayerCardItem;
    });
  }, [context]);

  const handleToggleCard = (card: LayerCardItem) => {
    // mapTileLayerId is derived inside context store when needed
    const existingCtx = context.find(
      (ctx) => ctx.contextType === "layer" && ctx.datasetId === card.dataset_id
    );

    if (!card.selected) {
      addContext({
        contextType: "layer",
        content: card.dataset_name,
        datasetId: card.dataset_id,
        tileUrl: card.tile_url,
        layerName: card.dataset_name,
      });
      return;
    }

    // Currently selected → remove from context (which also removes map layer if datasetId is present)
    if (existingCtx) {
      removeContext(existingCtx.id);
    }
  };

  return (
    <Stack bg="bg.subtle" pt={3} minW={0} w="100%">
      <Box px={4}>
        <InputGroup endElement={<MagnifyingGlassIcon />}>
          <Input size="sm" bg="bg" type="text" placeholder="Find data layer" />
        </InputGroup>
      </Box>
      <Stack px={4} pt={3} borderTopWidth="1px" borderColor="border" minH={0}>
        <TagList tags={LAYER_TAGS} />
        <LayerCardList cards={cards} onCardClick={handleToggleCard} />
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
  const { addGeoJsonFeature, flyToGeoJsonWithRetry } = useMapStore();
  const { context, upsertContextByType } = useContextStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = (customAreas as unknown as CustomArea[] | undefined) ?? [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((a: CustomArea) => a.name.toLowerCase().includes(q));
  }, [customAreas, query]);

  const cards = useMemo(
    () =>
      filtered.map((a) => {
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
    [filtered, context]
  );

  const handleSelectArea = (area: { id: string; name: string }) => {
    upsertContextByType({
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
      addGeoJsonFeature({
        id: selected.id,
        name: selected.name,
        data: feature,
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
      direction="row"
      bg="bg.subtle"
      px={4}
      py={3}
      gap={8}
      w="full"
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
