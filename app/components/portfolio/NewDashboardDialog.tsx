"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { MapPinIcon, SquaresFourIcon } from "@phosphor-icons/react";
import usePinnedInsightStore from "@/app/store/pinnedInsightStore";
import type { PinnedAoi } from "@/app/types/portfolio";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (aoi: PinnedAoi, name?: string) => void;
};

// Picks an AOI from the inbox to back a new (blank) dashboard.
// Mirrors AddMapDialog's AOI-from-inbox pattern but adds an optional
// dashboard-name step so the entry is named at creation time.
export default function NewDashboardDialog({ open, onClose, onCreate }: Props) {
  const insights = usePinnedInsightStore((s) => s.insights);
  const [pickedAoi, setPickedAoi] = useState<PinnedAoi | null>(null);
  const [name, setName] = useState("");

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

  function reset() {
    setPickedAoi(null);
    setName("");
  }

  function handleConfirm() {
    if (!pickedAoi) return;
    onCreate(pickedAoi, name.trim() || undefined);
    reset();
    onClose();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          reset();
          onClose();
        }
      }}
      size="md"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p={5}>
            <Dialog.Header px={0} pt={0} pb={3}>
              <Dialog.Title fontSize="md" fontWeight="semibold">
                <Flex align="center" gap={2}>
                  <SquaresFourIcon size={18} />
                  New dashboard
                </Flex>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={0}>
              {!pickedAoi ? (
                <>
                  <Text fontSize="xs" color="fg.muted" mb={3}>
                    Pick the area this dashboard will monitor. Insights and map
                    blocks added later will share this AOI.
                  </Text>
                  <VStack
                    align="stretch"
                    gap={2}
                    maxH="380px"
                    overflowY="auto"
                  >
                    {aois.length === 0 && (
                      <Box
                        border="1px dashed"
                        borderColor="border"
                        rounded="md"
                        p={6}
                        textAlign="center"
                        color="fg.muted"
                        fontSize="xs"
                      >
                        No AOIs available yet — pin an insight first so its AOI
                        can seed a dashboard.
                      </Box>
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
                            </Text>
                          </Box>
                          {aoi.isMultiArea && (
                            <Badge
                              size="xs"
                              colorPalette="orange"
                              variant="subtle"
                            >
                              Multi
                            </Badge>
                          )}
                        </Flex>
                        <Button
                          size="xs"
                          colorPalette="green"
                          onClick={() => {
                            setPickedAoi(aoi);
                            setName(aoi.name);
                          }}
                        >
                          Use
                        </Button>
                      </Flex>
                    ))}
                  </VStack>
                </>
              ) : (
                <VStack align="stretch" gap={3}>
                  <Flex
                    align="center"
                    gap={2}
                    px={3}
                    py={2}
                    bg="green.subtle"
                    rounded="md"
                  >
                    <MapPinIcon size={14} />
                    <Box minW={0} flex="1">
                      <Text fontSize="sm" fontWeight="medium" truncate>
                        {pickedAoi.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {pickedAoi.isMultiArea
                          ? `${pickedAoi.src_ids.length} areas · ${pickedAoi.source}`
                          : pickedAoi.source}
                      </Text>
                    </Box>
                    <Button
                      size="2xs"
                      variant="ghost"
                      onClick={() => setPickedAoi(null)}
                    >
                      Change
                    </Button>
                  </Flex>

                  <Field.Root>
                    <Field.Label>Dashboard name</Field.Label>
                    <Input
                      placeholder={pickedAoi.name}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                    <Field.HelperText>
                      Defaults to the AOI name if left blank.
                    </Field.HelperText>
                  </Field.Root>

                  <Flex gap={2} justify="flex-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        reset();
                        onClose();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="primary"
                      onClick={handleConfirm}
                    >
                      Create dashboard
                    </Button>
                  </Flex>
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
