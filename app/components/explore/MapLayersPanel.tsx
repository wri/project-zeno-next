"use client";

import { Box, Button, Flex, Heading } from "@chakra-ui/react";
import { PlusIcon } from "@phosphor-icons/react";
import useExplorePanelStore from "@/app/store/explorePanelStore";
import { Legend } from "@/app/components/legend/Legend";
import { useLegendHook } from "@/app/components/legend/useLegendHook";
import { PANEL_WIDTH } from "./LeftPanelContainer";
import PageHeader from "@/app/components/PageHeader";

export default function MapLayersPanel() {
  const { panelState, openDataset } = useExplorePanelStore();
  const { layers, handleLayerAction } = useLegendHook();

  const isLeftPanelOpen = panelState !== "minimized";
  const leftOffset = isLeftPanelOpen ? PANEL_WIDTH + 12 : 12;

  return (
    <Flex
      position="absolute"
      top={3}
      left={`${leftOffset}px`}
      zIndex={150}
      width="320px"
      transition="left 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      hideBelow="md"
      pointerEvents="auto"
      flexDir="column"
      gap={2}
    >
      {/* Global header */}
      <PageHeader />

      {/* Map layers */}
      <Box
        bg="bg"
        rounded="md"
        shadow="md"
        overflow="hidden"
        border="1px solid"
        borderColor="border.muted"
      >
        {/* Header */}
        <Flex
          px={3}
          py={2}
          alignItems="center"
          justifyContent="space-between"
          borderBottom={layers.length > 0 ? "1px solid" : "none"}
          borderColor="border.muted"
        >
          <Heading size="xs" fontWeight="semibold" m={0}>
            Map layers
          </Heading>
          <Button
            size="xs"
            variant="ghost"
            color="primary.fg"
            onClick={openDataset}
          >
            <PlusIcon weight="bold" />
            Add layer
          </Button>
        </Flex>

        {/* Layer list */}
        {layers.length > 0 && (
          <Legend
            layers={layers}
            onLayerAction={handleLayerAction}
            inline
          />
        )}
      </Box>
    </Flex>
  );
}
