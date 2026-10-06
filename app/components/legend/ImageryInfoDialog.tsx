import type { ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  Grid,
  Heading,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "@/app/components/DatasetInfoModal";
import type { ImageryMetadata } from "@/app/constants/planet-metadata";
import { imageryCitation } from "@/app/utils/imagery";

/**
 * Full provider metadata (Planet's is several paragraphs, too long for the
 * legend's info popover), styled after the catalog's DatasetInfoModal. The
 * citation is filled with the live capture's year and today's date.
 */
export function ImageryInfoDialog(props: {
  metadata: ImageryMetadata;
  imageDate?: string;
  /** The element that opens the dialog (the legend's info button). */
  children: ReactNode;
}) {
  const { metadata, imageDate, children } = props;

  return (
    <Dialog.Root lazyMount>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop backdropFilter="blur(8px)" />
        <Dialog.Positioner zIndex={1600}>
          <Dialog.Content maxW="3xl" p="10" borderRadius="8px">
            <Dialog.Title mb="4" fontSize="xl" fontWeight="bold" pr="6">
              {metadata.title}
            </Dialog.Title>
            <Dialog.Description asChild>
              <VStack
                gap="5"
                align="stretch"
                maxH="70vh"
                overflowY="auto"
                pr="6"
                pb="6"
              >
                <Grid
                  as="dl"
                  templateColumns={{ base: "1fr", md: "max-content 1fr" }}
                  columnGap="6"
                  rowGap="3"
                >
                  {metadata.facts.map((fact) => (
                    <Box key={fact.label} display="contents">
                      <Text
                        as="dt"
                        fontSize="xs"
                        fontWeight="semibold"
                        color="gray.500"
                        textTransform="uppercase"
                        pt="0.5"
                      >
                        {fact.label}
                      </Text>
                      <Text as="dd" fontSize="sm">
                        {fact.value}
                      </Text>
                    </Box>
                  ))}
                </Grid>
                <Separator />
                <Box>
                  <Heading size="sm" mb={3} color="gray.500">
                    Overview
                  </Heading>
                  <Box css={{ "& p + p": { mt: 3 } }}>
                    <ReactMarkdown components={markdownComponents}>
                      {metadata.overview}
                    </ReactMarkdown>
                  </Box>
                </Box>
                <Separator />
                <Box>
                  <Heading size="sm" mb={3} color="gray.500">
                    Citation
                  </Heading>
                  <Text>
                    {imageryCitation(metadata.citation, imageDate, new Date())}
                  </Text>
                </Box>
              </VStack>
            </Dialog.Description>
            <Dialog.CloseTrigger asChild pos="absolute" top="2" right="2">
              <Button variant="ghost" size="sm" p="2" aria-label="Close">
                <XIcon size={16} />
              </Button>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
