"use client";

import { useState } from "react";
import { LeafIcon, StackPlusIcon } from "@phosphor-icons/react";
import {
  Box,
  Grid,
  Text,
  Link as ChLink,
  Dialog,
  Portal,
  Button,
  Badge,
  Flex,
  Slider,
} from "@chakra-ui/react";
import Link from "next/link";

import PageHeader from "@/app/components/PageHeader";
import Map from "@/app/components/Map";
import ChatStatusInfo from "@/app/components/ChatStatusInfo";
import { LayerMenu } from "@/app/components/ContextMenu";

import { LegendLayer } from "@/app/components/legend/types";
import { Legend } from "@/app/components/legend/Legend";
import { LegendSequential } from "@/app/components/legend/LegendSequential";
import { LegendSymbolList } from "@/app/components/legend/LegendSymbolList";
import { LegendCategorical } from "@/app/components/legend/LegendCategorical";
import { LegendDivergent } from "@/app/components/legend/LegendDivergent";

const exLayers: LegendLayer[] = [
  {
    id: "l1",
    title: "Tree Cover Loss somewhere in the world",
    visible: true,
    opacity: 100,
    dateRange: "2010 - 2020",
    symbology: (
      <LegendSequential
        min={10}
        max={100}
        color={["#4CAF50", "#FFC107", "#2196F3"]}
      />
    ),
    children: (
      <>
        <Slider.Root width="100%">
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
            <Slider.Marks
              marks={[
                { value: 0, label: "2010" },
                { value: 20, label: "2012" },
                { value: 40, label: "2014" },
                { value: 60, label: "2016" },
                { value: 80, label: "2018" },
                { value: 100, label: "2020" },
              ]}
            />
          </Slider.Control>
        </Slider.Root>
        <Text>Tree cover loss is not always deforestation</Text>
      </>
    ),
  },
  {
    id: "l2",
    title: "Disturbance alerts",
    visible: true,
    opacity: 100,
    symbology: (
      <LegendSymbolList
        items={[
          {
            color: "#4CAF50",
            value: "Estimated Tree Cover Loss 4PSG 932 (hsa)",
          },
          {
            color: "#FFC107",
            value: "Estimated burn area",
          },
          {
            type: "line",
            color: "#FF5722",
            value: "Estimated deforestation",
          },
          {
            type: "dashed",
            color: "#22ffde",
            value: "Watershed",
          },
          {
            type: "icon",
            color: "#00d77d",
            value: "Recycling",
            icon: <LeafIcon size={16} />,
          },
        ]}
      />
    ),
  },
  {
    id: "l3",
    title: "Area types",
    visible: true,
    opacity: 100,
    symbology: (
      <LegendCategorical
        items={[
          { color: "#4CAF50", value: "Forest" },
          { color: "#FFC107", value: "Grassland" },
          { color: "#2196F3", value: "Wetland" },
          { color: "#9E9E9E", value: "Barren" },
          { color: "#F44336", value: "Urban" },
          { color: "#0a986b", value: "Tundra" },
          { color: "#e4e0e0", value: "Snowy" },
        ]}
      />
    ),
  },
  {
    id: "l4",
    title: "Diff from prev year",
    visible: true,
    opacity: 100,
    symbology: (
      <LegendDivergent
        min={-1}
        max={1}
        color={["#2196F3", "#b41919", "#ff00dd"]}
      />
    ),
  },
];

export default function ClassicLayout() {
  const [layers, setLayers] = useState<LegendLayer[]>(exLayers);

  return (
    <Grid
      maxH="100vh"
      h="100vh"
      templateRows="min-content minmax(0px, 1fr)"
      bg="bg"
    >
      <PageHeader />
      <Box h="calc(100vh - 3rem)" overflow="hidden" position="relative">
        <ChatStatusInfo
          position="absolute"
          top={4}
          left={4}
          m={0}
          zIndex={100}
          p={2}
          borderRadius="md"
        >
          <Text>
            AI features are unavailable.{" "}
            <ChLink as={Link} href="/">
              Go back to AI conversations
            </ChLink>
            .
          </Text>
        </ChatStatusInfo>
        <Flex
          position="absolute"
          zIndex={100}
          top={4}
          w="100%"
          justifyContent="center"
        >
          <LayerDialog open onOpenChange={() => {}} />
        </Flex>
        <Legend layers={layers} onLayersChange={setLayers} />
        <Map disableMapAreaControls />
      </Box>
    </Grid>
  );
}

function LayerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (e: { open: boolean }) => void;
}) {
  const selectedItems = 0;

  return (
    <Dialog.Root
      placement="top"
      motionPreset="slide-in-bottom"
      size="lg"
      // open={open}
      scrollBehavior="inside"
      onOpenChange={onOpenChange}
    >
      <Dialog.Trigger asChild>
        <Button
          size="sm"
          variant="subtle"
          aria-label="Open data layer dialog"
          bg="bg"
          _hover={{ bg: "bg.emphasized" }}
        >
          <StackPlusIcon /> Add data layer
        </Button>
      </Dialog.Trigger>
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
              <LayerMenu />
            </Dialog.Body>
            <Dialog.Footer
              justifyContent="space-between"
              borderTop="1px solid"
              borderColor="border"
              py={2}
              px={3}
            >
              <Badge size="sm" borderRadius="full">
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
