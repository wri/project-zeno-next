"use client";

import { ReactNode, useState } from "react";
import {
  Box,
  CloseButton,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Portal,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowsOutIcon, InfoIcon } from "@phosphor-icons/react";

interface ChartCardProps {
  readonly title: string;
  /** One-line always-visible caption under the title. */
  readonly help?: string;
  /**
   * Richer "how to read this" content behind the ⓘ toggle: what the encodings
   * mean, what patterns to look for, caveats.
   */
  readonly info?: ReactNode;
  readonly children: ReactNode;
}

/** Panel wrapper giving every chart a consistent GNW-styled frame, with a
 * fullscreen dialog so dense charts (sankeys, wide tables, long time series)
 * get room to breathe. */
export function ChartCard({ title, help, info, children }: ChartCardProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { open, onOpen, onClose } = useDisclosure();

  const infoPanel =
    info && infoOpen ? (
      <Box
        bg="bg.info"
        borderWidth="1px"
        borderColor="border.info"
        borderRadius="sm"
        px={3}
        py={2}
        mb={3}
        fontSize="xs"
        color="fg.muted"
      >
        {info}
      </Box>
    ) : null;

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      p={4}
      minW={0}
    >
      <Flex align="flex-start" justify="space-between" gap={2} mb={3}>
        <Box minW={0}>
          <Heading as="h4" size="sm">
            {title}
          </Heading>
          {help ? (
            <Text fontSize="xs" color="fg.muted" mt={0.5}>
              {help}
            </Text>
          ) : null}
        </Box>
        <Flex gap={1} flexShrink={0}>
          {info ? (
            <IconButton
              aria-label={
                infoOpen ? "Hide chart explanation" : "How to read this chart"
              }
              title="How to read this chart"
              size="xs"
              variant="ghost"
              color={infoOpen ? "primary.fg" : "fg.subtle"}
              onClick={() => setInfoOpen((prev) => !prev)}
            >
              <InfoIcon size={16} weight={infoOpen ? "fill" : "regular"} />
            </IconButton>
          ) : null}
          <IconButton
            aria-label={`View "${title}" fullscreen`}
            title="View fullscreen"
            size="xs"
            variant="ghost"
            color="fg.subtle"
            onClick={onOpen}
          >
            <ArrowsOutIcon size={16} />
          </IconButton>
        </Flex>
      </Flex>
      {infoPanel}
      {children}

      <Dialog.Root
        open={open}
        onOpenChange={(e) => !e.open && onClose()}
        size="cover"
        lazyMount
        unmountOnExit
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content p={4}>
              <Dialog.Header px={0} pt={0} pb={3}>
                <Box minW={0}>
                  <Dialog.Title fontSize="md" fontWeight="medium">
                    {title}
                  </Dialog.Title>
                  {help ? (
                    <Text fontSize="xs" color="fg.muted" mt={0.5}>
                      {help}
                    </Text>
                  ) : null}
                </Box>
                <Dialog.CloseTrigger
                  asChild
                  position="absolute"
                  top={3}
                  right={3}
                >
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body px={0} pb={0} minH={0} overflow="auto">
                {infoPanel}
                {children}
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}
