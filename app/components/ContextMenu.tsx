import {
  Box,
  Card,
  Image,
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
  AbsoluteCenter,
} from "@chakra-ui/react";
import { ChatContextType, ChatContextOptions } from "./ContextButton";
import { InfoIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";

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

const LAYER_CARDS = [
  {
    title: "Fire alerts (VIIRS)",
    description: "daily, 375 m, global, NASA",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
    selected: true,
  },
  {
    title: "Integrated deforestation alerts",
    description:
      "Integrated layer of tropical alerts: GLAD-L/GLAD-S2/RADD. Data from UMD and...",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
  },
  {
    title: "Tree Cover Gain",
    description: "20 years, 30 m, global, Hansen/UMD/Google/USGS/NASA",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
  },
];

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
      overflowY="auto"
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

function CardList({
  cards,
  showImage = false,
}: {
  cards: {
    title: string;
    description: string;
    img?: string;
    selected?: boolean;
  }[];
  showImage?: boolean;
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
          {showImage && card.img && (
            <Image
              objectFit="cover"
              maxW="5rem"
              src={card.img}
              alt={card.title}
            />
          )}
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

function TagList({ tags }: { tags: { label: string; selected?: boolean }[] }) {
  return (
    <Flex gap="2" maxW="100%" overflow="auto">
      {tags.map((tag) => (
        <Button
          key={tag.label}
          size="xs"
          h={6}
          borderRadius="full"
          colorPalette={tag.selected ? "blue" : undefined}
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
  // const [open, setOpen] = useState(false)
  const [selectedContextType, setSelectedContextType] = useState(contextType);
  const selectedItems = 0;

  const renderContent = (): React.ReactElement => {
    if (selectedContextType === "layer") {
      return (
        <Stack
          bg="bg.subtle"
          py={3}
          w="full"
          maxW="100%"
          maxH="100%"
          overflow="scroll"
        >
          <Box px={4}>
            <InputGroup endElement={<MagnifyingGlassIcon />}>
              <Input
                size="sm"
                bg="bg"
                type="text"
                placeholder="Find data layer"
              />
            </InputGroup>
          </Box>
          <Stack p={4} py={3} borderTopWidth="1px" borderColor="border">
            <TagList tags={LAYER_TAGS} />
            <CardList cards={LAYER_CARDS} showImage />
          </Stack>
        </Stack>
      );
    }
    if (selectedContextType === "area") {
      return (
        <Stack bg="bg.subtle" py={3} w="full" maxH="100%" overflow="scroll">
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
          <Stack p={4} py={3} borderTopWidth="1px" borderColor="border">
            <TagList tags={AREA_TAGS} />
            <CardList cards={AREA_CARDS} />
          </Stack>
        </Stack>
      );
    }
    if (selectedContextType === "date") {
      return (
        <Stack
          direction="row"
          bg="bg.subtle"
          px={4}
          py={3}
          w="full"
          position="relative"
        >
          <AbsoluteCenter display="flex" gap="4">
            <Field.Root>
              <Field.Label fontWeight="normal" fontSize="xs">
                Date Resolution
              </Field.Label>
              <ButtonGroup attached size="xs">
                <Button variant="outline">Year</Button>
                <Button variant="solid" colorPalette="blue">
                  Month
                </Button>
                <Button variant="outline">Day</Button>
              </ButtonGroup>
            </Field.Root>
            <Field.Root>
              <Field.Label fontWeight="normal" fontSize="xs">
                From:
              </Field.Label>
              <Input
                size="xs"
                bg="bg"
                type="month"
                id="start"
                name="start"
                min="2024-03"
                value="2024-03"
                maxW="8rem"
                readOnly // Placeholder
              />
            </Field.Root>
            <Field.Root>
              <Field.Label fontWeight="normal" fontSize="xs">
                To:
              </Field.Label>
              <Input
                size="xs"
                bg="bg"
                type="month"
                id="end"
                name="end"
                max="2025-05"
                value="2025-05"
                maxW="8rem"
                readOnly // Placeholder
              />
            </Field.Root>
          </AbsoluteCenter>
        </Stack>
      );
    }
    return <Box />;
  };

  return (
    <Dialog.Root
      placement="bottom"
      motionPreset="slide-in-bottom"
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content h="30rem" maxH="75vh" overflow="hidden">
            <Flex flex="1" maxH="100%" overflow="hidden">
              {/* Modal Navigation */}
              <ContextNav
                selected={selectedContextType}
                onSelect={setSelectedContextType}
              />
              {/* Modal Body */}
              {renderContent()}
            </Flex>
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
                colorPalette="blue"
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
