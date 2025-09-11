"use client";

import { StackPlusIcon } from "@phosphor-icons/react";
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
} from "@chakra-ui/react";
import Link from "next/link";

import PageHeader from "@/app/components/PageHeader";
import Map from "@/app/components/Map";
import ChatStatusInfo from "@/app/components/ChatStatusInfo";
import { LayerMenu } from "@/app/components/ContextMenu";

import { Legend } from "@/app/components/legend/Legend";
import { useLegendHook } from "@/app/components/legend/useLegendHook";
import useContextStore from "@/app/store/contextStore";

export default function ClassicLayout() {
  const { layers, handleLayerAction } = useLegendHook();

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
          <LayerDialog />
        </Flex>
        <Legend layers={layers} onLayerAction={handleLayerAction} />
        <Map disableMapAreaControls />
      </Box>
    </Grid>
  );
}

function LayerDialog() {
  const { context, removeContext } = useContextStore();
  const activeItems = context.filter((c) => c.contextType === "layer");
  const selectedItems = activeItems.length;

  return (
    <Dialog.Root
      placement="top"
      motionPreset="slide-in-bottom"
      size="lg"
      scrollBehavior="inside"
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
                onClick={() => {
                  activeItems.forEach((item) => removeContext(item.id));
                }}
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
