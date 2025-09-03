import {
  Dialog,
  Portal,
  Button,
  Text,
  VStack,
  Heading,
  Box,
  Separator,
} from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";
import { DatasetInfo } from "@/app/types/chat";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface DatasetInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetInfo;
}

export function DatasetInfoModal({
  isOpen,
  onClose,
  dataset,
}: DatasetInfoModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop backdropFilter="blur(8px)" />
        <Dialog.Positioner>
          <Dialog.Content maxW="3xl" p="10" borderRadius="8px">
            <Dialog.Title mb="4" fontSize="xl" fontWeight="bold" pr="6">{dataset.dataset_name}</Dialog.Title>
            <Dialog.Description asChild>
              <VStack gap="5" align="stretch" maxH="70vh" overflowY="auto" pr="6" pb="6">
                <Box>
                  <Heading size="sm" mb={3} color="gray.500">
                    Description
                  </Heading>
                  <Box>
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                      {dataset.description ?? ""}
                    </ReactMarkdown>
                  </Box>
                </Box>
                <Separator />
                {dataset.methodology && (
                  <Box>
                    <Heading size="sm" mb={3} color="gray.500">
                      Methodology
                    </Heading>
                    <Box>
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {dataset.methodology}
                      </ReactMarkdown>
                    </Box>
                  </Box>
                )}
                {dataset.methodology && <Separator />}
                {dataset.cautions && (
                  <Box>
                    <Heading size="sm" mb={3} color="gray.500">
                      Cautions
                    </Heading>
                    <Box>
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {dataset.cautions}
                      </ReactMarkdown>
                    </Box>
                  </Box>
                )}
                {dataset.cautions && <Separator />}
                {dataset.citation && (
                  <Box>
                    <Heading size="sm" mb={3} color="gray.500">
                      Citation
                    </Heading>
                    <Box>
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {dataset.citation}
                      </ReactMarkdown>
                    </Box>
                  </Box>
                )}
              </VStack>
            </Dialog.Description>
            <Dialog.CloseTrigger asChild pos="absolute" top="2" right="2">
              <Button variant="ghost" size="sm" p="2">
                <XIcon size={16} />
              </Button>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
