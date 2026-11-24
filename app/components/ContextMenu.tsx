import { Suspense, useEffect, useMemo, useState } from "react";
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

import { ChatContextType, ChatContextOptions } from "./ContextButton";
import { DatePicker, DatePickerProps } from "./DatePicker";
import useChatStore from "../store/chatStore";
import { DatasetRow } from "./DatasetRow";

// Constants for navigation and dummy content
const CONTEXT_NAV = (Object.keys(ChatContextOptions) as ChatContextType[])
  .filter((type) => type !== "date")
  .map((type) => ({
    type,
    label: ChatContextOptions[type].label,
    icon: ChatContextOptions[type].icon,
  }));

import {
  ORDERED_DATASET_CARDS,
  DatasetCardConfig,
} from "../constants/datasets";
import { filterDatasetsByFeatureFlag } from "@/app/utils/filterDatasetsByFeatureFlag";
import { useEnabledFlags } from "@/src/shared/lib/feature-flags";
import { toaster } from "@/app/components/ui/toaster";
import useMapStore from "../store/mapStore";
import { datasetCardLayers } from "../utils/datasetCardLayerContext";
import {
  addLibraryAreaToMap,
  findLibraryAreaLayer,
} from "../utils/libraryAreaMap";
import { useUserAoisSuspense } from "@/src/entities/user-aoi";

const LAYER_CARDS = ORDERED_DATASET_CARDS;

function ContextNav({
  selected,
  onSelect,
  hiddenTypes = [],
}: {
  selected: string;
  onSelect: (type: ChatContextType) => void;
  hiddenTypes?: ChatContextType[];
}) {
  const navItems = CONTEXT_NAV.filter((nav) => !hiddenTypes.includes(nav.type));

  if (navItems.length === 0) return null;

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
      {navItems.map((nav) => (
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
  const { layers, addLayer, removeDatasetLayers } = useMapStore();
  // Same gate as the Data Catalog — a flagged dataset is browsable in neither
  // surface until its flag is on. The menu is a dialog, so this only renders
  // after the user opens it (no SSR/hydration branch).
  const enabledFlags = useEnabledFlags();
  const visibleCards = filterDatasetsByFeatureFlag(cards, enabledFlags);

  function handleToggle(card: DatasetCardConfig, checked: boolean) {
    // Single-dataset selection: clear any existing dataset layers, then add the
    // clicked one when switching it on. The visible layer IS the scope (no
    // separate context item).
    removeDatasetLayers();
    if (checked) {
      datasetCardLayers(card).forEach(addLayer);
    }
  }

  return (
    <Stack gap="6px" minH={0} overflowY="auto">
      {visibleCards.map((card) => (
        <DatasetRow
          key={card.dataset_name}
          dataset={card}
          img={card.img}
          viewOnly={card.viewOnly}
          interaction={{
            mode: "toggle",
            checked: layers.some((l) => l.datasetId === card.dataset_id),
            onChange: (checked) => handleToggle(card, checked),
          }}
        />
      ))}
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
      placement={{ base: "bottom", md: "center" }}
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
            // Square modal on desktop; maxH caps it on short viewports so the
            // body scrolls (scrollBehavior="inside") rather than overflowing.
            boxSize={{ md: "38rem" }}
            minH={{ base: "30rem" }}
            maxH="75vh"
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
                hiddenTypes={contextType === "area" ? ["layer"] : []}
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
  const { data: entries } = useUserAoisSuspense();
  const layers = useMapStore((s) => s.layers);
  const [query, setQuery] = useState("");

  const cards = useMemo(() => {
    const q = query.toLowerCase();
    return entries
      .filter((entry) => !q || entry.name.toLowerCase().includes(q))
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        selected: !!findLibraryAreaLayer(layers, entry),
      }));
  }, [entries, query, layers]);

  const handleSelectArea = async (card: { id: string; name: string }) => {
    const entry = entries.find((e) => e.id === card.id);
    if (!entry) return;
    try {
      await addLibraryAreaToMap(entry);
    } catch (error) {
      console.error(`Failed to add "${entry.name}" to the map:`, error);
      toaster.create({
        type: "error",
        title: "Couldn't add this area",
        description: `"${entry.name}" couldn't be loaded. Please try again.`,
      });
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
            No areas found
          </Box>
        ) : (
          <AreaCardList
            cards={cards}
            onCardClick={(card) => void handleSelectArea(card)}
          />
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

  const dateRange = useChatStore((s) => s.dateRange);
  const setDateRange = useChatStore((s) => s.setDateRange);

  // Start with the current chatStore date range if set, otherwise empty.
  const [dateValue, setDateValue] = useState<Date[]>(
    dateRange ? [dateRange.start, dateRange.end] : []
  );

  useEffect(() => {
    if (dateValue.length === 2) {
      setDateRange({ start: dateValue[0], end: dateValue[1] });
    }
  }, [dateValue, setDateRange]);

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
