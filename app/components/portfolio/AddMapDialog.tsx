"use client";

import { useMemo } from "react";
import {
  Dialog,
  Portal,
  Box,
  Flex,
  Text,
  VStack,
  Button,
  Badge,
  CloseButton,
} from "@chakra-ui/react";
import { MapPinIcon } from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import type { PinnedAoi } from "@/app/types/portfolio";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (aoi: PinnedAoi) => void;
};

// Picks a unique AOI from the inbox to back a new map block.
// Uniqueness is keyed by sorted src_ids (falling back to the area name
// for custom AOIs that have no src_ids). The first PinnedAoi we see per
// key is the one offered — its geometry snapshot will travel into the
// new map block.
export default function AddMapDialog({ open, onClose, onPick }: Props) {
  const insights = useInsightStore((s) => s.insights);

  const aois = useMemo(() => {
    const seen = new Map<string, PinnedAoi>();
    for (const i of insights) {
      const key =
        i.aoi.src_ids.length > 0
          ? [...i.aoi.src_ids].sort().join(",")
          : i.aoi.name;
      if (!seen.has(key)) seen.set(key, i.aoi);
    }
    return [...seen.values()];
  }, [insights]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="md"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p={5}>
            <Dialog.Header px={0} pt={0} pb={3}>
              <Dialog.Title fontSize="md" fontWeight="semibold">
                Add map block
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={0}>
              <Text fontSize="xs" color="fg.muted" mb={3}>
                Pick an area from your inbox. The map will reuse the polygon
                snapshot from that insight.
              </Text>
              <VStack align="stretch" gap={2} maxH="380px" overflowY="auto">
                {aois.length === 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    No AOIs in your inbox yet — pin an insight first.
                  </Text>
                )}
                {aois.map((aoi, idx) => (
                  <Flex
                    key={`${aoi.name}-${idx}`}
                    align="center"
                    justify="space-between"
                    gap={3}
                    px={3}
                    py={2}
                    border="1px solid"
                    borderColor="border"
                    rounded="md"
                    _hover={{ borderColor: "green.fg" }}
                  >
                    <Flex align="center" gap={2} minW={0}>
                      <MapPinIcon size={14} />
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="medium" truncate>
                          {aoi.name}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {aoi.isMultiArea
                            ? `${aoi.src_ids.length} areas · ${aoi.source}`
                            : aoi.source}
                          {!aoi.geometry && " · placeholder"}
                        </Text>
                      </Box>
                      {aoi.isMultiArea && (
                        <Badge size="xs" colorPalette="orange" variant="subtle">
                          Multi
                        </Badge>
                      )}
                    </Flex>
                    <Button
                      size="xs"
                      colorPalette="green"
                      onClick={() => {
                        onPick(aoi);
                        onClose();
                      }}
                    >
                      Add
                    </Button>
                  </Flex>
                ))}
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
