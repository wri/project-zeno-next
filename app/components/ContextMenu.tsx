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
import ContextButton, { ChatContextType } from "./ContextButton";
import {
  CalendarBlankIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  PolygonIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

function ContextMenu({ contextType }: { contextType: ChatContextType }) {
  const [selectedContextType, setSelectedContextType] = useState(contextType);
  const selectedItems = 0;

  const renderContent = (): React.ReactElement => {
    if (selectedContextType === "layer") {
      return (
        <Stack bg="bg.subtle" py={3} w="full" maxW="100%" overflow="hidden">
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
            <Flex gap="2" maxW="100%" overflow="auto">
              <Button size="xs" borderRadius="full" colorPalette="blue">{/* Selected */}
                Recent
              </Button>
              <Button size="xs" borderRadius="full" variant="outline">
                Forest Change
              </Button>
              <Button size="xs" borderRadius="full" variant="outline">
                Land Cover
              </Button>
              <Button size="xs" borderRadius="full" variant="outline">
                Land Use
              </Button>
              <Button size="xs" borderRadius="full" variant="outline">
                Climate
              </Button>
              <Button size="xs" borderRadius="full" variant="outline">
                Biodiversity
              </Button>
            </Flex>
            <Stack>
              <Card.Root
                size="sm"
                flexDirection="row"
                overflow="hidden"
                maxW="xl"
                border="2px solid"
                borderColor="blue.800"
              >
                <Image
                  objectFit="cover"
                  maxW="5rem"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png"
                  alt="Caffe Latte"
                />
                <Card.Body>
                  <Card.Title
                    display="flex"
                    gap="1"
                    alignItems="center"
                    fontSize="sm"
                  >
                    Fire alerts (VIIRS)
                    <InfoIcon />
                  </Card.Title>
                  <Card.Description fontSize="xs" color="fg.muted">
                    daily, 375 m, global, NASA
                  </Card.Description>
                </Card.Body>
              </Card.Root>
              <Card.Root
                size="sm"
                flexDirection="row"
                overflow="hidden"
                maxW="xl"
              >
                <Image
                  objectFit="cover"
                  maxW="5rem"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png"
                  alt="Caffe Latte"
                />
                <Card.Body>
                  <Card.Title
                    display="flex"
                    gap="1"
                    alignItems="center"
                    fontSize="sm"
                  >
                    Integrated deforestation alerts
                    <InfoIcon />
                  </Card.Title>
                  <Card.Description fontSize="xs" color="fg.muted">
                    Integrated layer of tropical alerts: GLAD-L/GLAD-S2/RADD. Data from UMD and...
                  </Card.Description>
                </Card.Body>
              </Card.Root>
            </Stack>
          </Stack>
        </Stack>
      );
    }
    if (selectedContextType === "area") {
      return (
        <Stack bg="bg.subtle" py={3} w="full">
          <Flex px={4} gap={2}>
            <InputGroup endElement={<MagnifyingGlassIcon />}>
              <Input size="sm" bg="bg" type="text" placeholder="Find area" />
            </InputGroup>
            <NativeSelect.Root size="xs" alignSelf="stretch" w="16rem">
              {/* TODO: explore replacing with Chakra UI Select, requiring more composition than NativeSelect. NB Portal requirements */}
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
            <Flex gap="2">
              <Button size="xs" borderRadius="full" colorPalette="blue">
                In this conversation
              </Button>
              <Button size="xs" borderRadius="full" variant="outline">
                From past conversations
              </Button>
            </Flex>
            <Stack>
              <Card.Root
                size="sm"
                flexDirection="row"
                overflow="hidden"
                maxW="xl"
                border="2px solid"
                borderColor="blue.800"
              >
                <Card.Body>
                  <Card.Title fontSize="sm">
                    Areas at risk of fire in northern Australia woodlands
                  </Card.Title>
                  <Card.Description fontSize="sm" color="fg.muted">
                    Custom area
                  </Card.Description>
                </Card.Body>
              </Card.Root>
              <Card.Root
                size="sm"
                flexDirection="row"
                overflow="hidden"
                maxW="xl"
              >
                <Card.Body>
                  <Card.Title fontSize="sm">Pará, Brazil</Card.Title>
                  <Card.Description fontSize="sm" color="fg.muted">
                    Political boundaries
                  </Card.Description>
                </Card.Body>
              </Card.Root>
            </Stack>
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
              />
            </Field.Root>
          </AbsoluteCenter>
        </Stack>
      );
    }
    return <Box />;
  };

  return (
    <Dialog.Root placement="bottom" motionPreset="slide-in-bottom" size="lg">
      <Dialog.Trigger>
        <ContextButton contextType={contextType} />
      </Dialog.Trigger>
      <Portal>
        <Dialog.Positioner>
          <Dialog.Content minH="36rem" overflow="hidden">
            <Flex flex="1">
              {/* Modal Navigation */}
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
                <Button
                  size="xs"
                  variant={selectedContextType === "layer" ? "subtle" : "ghost"}
                  color={
                    selectedContextType === "layer" ? "inherit" : "gray.500"
                  }
                  justifyContent="flex-start"
                  onClick={() => setSelectedContextType("layer")}
                >
                  <StackSimpleIcon />
                  Data Layers
                </Button>
                <Button
                  size="xs"
                  variant={selectedContextType === "area" ? "subtle" : "ghost"}
                  color={
                    selectedContextType === "area" ? "inherit" : "gray.500"
                  }
                  justifyContent="flex-start"
                  onClick={() => setSelectedContextType("area")}
                >
                  <PolygonIcon />
                  Area
                </Button>
                <Button
                  size="xs"
                  variant={selectedContextType === "date" ? "subtle" : "ghost"}
                  color={
                    selectedContextType === "date" ? "inherit" : "gray.500"
                  }
                  justifyContent="flex-start"
                  onClick={() => setSelectedContextType("date")}
                >
                  <CalendarBlankIcon />
                  Date
                </Button>
              </Stack>
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
