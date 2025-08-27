import {
  Dialog,
  Portal,
  Button,
  Text,
  VStack,
  Heading,
  Box,
} from "@chakra-ui/react";
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
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="3xl">
            <Dialog.Title>{dataset.dataset_name}</Dialog.Title>
            <Dialog.Description asChild>
              <VStack gap="4" align="stretch" mt={4} maxH="70vh" overflowY="auto" pr={6}>
                <Box>
                  <Heading size="sm" mb={2}>
                    Description
                  </Heading>
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                    {dataset.description ?? ""}
                  </ReactMarkdown>
                </Box>
                {dataset.methodology && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Methodology
                    </Heading>
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                      {dataset.methodology}
                    </ReactMarkdown>
                  </Box>
                )}
                {dataset.cautions && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Cautions
                    </Heading>
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                      {dataset.cautions}
                    </ReactMarkdown>
                  </Box>
                )}
                {dataset.citation && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Citation
                    </Heading>
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {dataset.citation}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Dialog.Description>
            <Dialog.CloseTrigger asChild pos="absolute" top="2" right="2">
              <Button variant="ghost">Close</Button>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
