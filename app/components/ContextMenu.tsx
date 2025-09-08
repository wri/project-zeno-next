import { useEffect, useMemo, useState } from "react";
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
  NativeSelect,
  ButtonGroup,
} from "@chakra-ui/react";
import { InfoIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
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

const LAYER_CARDS = DATASET_CARDS;

const AREA_TAGS = [
  { label: "In this conversation", selected: true },
  { label: "From past conversations" },
];

const AREA_CARDS = [
  {
    title: "Areas at risk of fire in northern Australia woodlands",
    description: "Custom area",
    selected: true,
  },
  {
    title: "Pará, Brazil",
    description: "Political boundaries",
  },
  {
    title: "Serra dos Carajás",
    description: "Key biodiversity areas",
  },
  {
    title: "Japurá-Solimões-Negro moist forests",
    description: "Terrestrial ecorregions",
  },
  {
    title: "Amazon",
    description: "River Basins",
  },
];

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
  reason: string;
  tile_url: string;
  selected?: boolean;
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
              overflow="visible"
              minH={0}
            >
              {/* Modal Navigation */}
              <ContextNav
                selected={selectedContextType}
                onSelect={setSelectedContextType}
              />
              {/* Modal Body */}
              {selectedContextType === "layer" && <LayerMenu />}
              {selectedContextType === "area" && <AreaMenu />}
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
}: {
  cards: { title: string; description: string; selected?: boolean }[];
}) {
  return (
    <Stack>
      {cards.map((card) => (
        <Card.Root
          key={card.title}
          size="sm"
          flexDirection="row"
          overflow="hidden"
          maxW="xl"
          border={card.selected ? "2px solid" : undefined}
          borderColor={card.selected ? "blue.800" : undefined}
        >
          <Card.Body>
            <Card.Title
              display="flex"
              gap="1"
              alignItems="center"
              fontSize="sm"
            >
              {card.title}
              <InfoIcon />
            </Card.Title>
            <Card.Description fontSize="xs" color="fg.muted">
              {card.description}
            </Card.Description>
          </Card.Body>
        </Card.Root>
      ))}
    </Stack>
  );
}

function AreaMenu() {
  return (
    <Stack bg="bg.subtle" py={3} w="full">
      <Flex px={4} gap={2}>
        <InputGroup endElement={<MagnifyingGlassIcon />}>
          <Input size="sm" bg="bg" type="text" placeholder="Find area" />
        </InputGroup>
        <NativeSelect.Root size="xs" alignSelf="stretch" w="16rem">
          <NativeSelect.Field
            placeholder="Political Boundaries"
            bg="bg"
            py={2}
            h="2.25rem"
          >
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Flex>
      <Stack
        px={4}
        pt={3}
        borderTopWidth="1px"
        borderColor="border"
        h="full"
        overflow="hidden"
      >
        <TagList tags={AREA_TAGS} />
        <AreaCardList cards={AREA_CARDS} />
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
