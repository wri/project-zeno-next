"use client";
import {
  Box,
  Button,
  Drawer,
  Flex,
  Heading,
  Text,
  useClipboard,
  Code,
  Separator,
  Portal,
  CloseButton,
  Link,
} from "@chakra-ui/react";
import { useMemo } from "react";
import type { InsightGeneration } from "@/app/types/chat";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface InsightProvenanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  generation?: InsightGeneration;
  title?: string;
}

// Helper to safely decode base64 strings (utf-8)
function safeBase64Decode(str: string): string {
  try {
    if (typeof window === "undefined") {
      return Buffer.from(str, "base64").toString("utf8");
    } else {
      const binary = atob(str);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
  } catch {
    // Return original string if decoding fails
    return str;
  }
}

function decodeCodeBlock(block: string): string {
  return safeBase64Decode(block);
}

function CodeBlockViewer({ code }: { code: string }) {
  const { copy, copied } = useClipboard({ value: code });
  return (
    <Box
      border="1px solid"
      borderColor="neutral.300"
      rounded="md"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        align="center"
        bg="neutral.50"
        px={3}
        py={2}
      >
        <Text fontSize="xs" color="neutral.600">
          Code
        </Text>
        <Button size="xs" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </Flex>
      <Box as="pre" m={0} p={3} bg="neutral.25" overflowX="auto">
        <Code whiteSpace="pre">{code}</Code>
      </Box>
    </Box>
  );
}

export default function InsightProvenanceDrawer({
  isOpen,
  onClose,
  generation,
  title,
}: InsightProvenanceDrawerProps) {
  const steps = useMemo(() => {
    const maxLen = Math.max(
      generation?.text_output?.length ?? 0,
      generation?.code_blocks?.length ?? 0,
      generation?.execution_outputs?.length ?? 0
    );
    return Array.from({ length: maxLen }, (_, i) => i);
  }, [generation]);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size="md"
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header borderBottomWidth="1px">
              <Heading size="sm" m={0}>
                {title
                  ? `How "${title}" was generated`
                  : "How this was generated"}
              </Heading>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" variant="plain" />
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body>
              {steps.length === 0 ? (
                <Text fontSize="sm" color="neutral.600">
                  No generation details available.
                </Text>
              ) : (
                <Flex direction="column" gap={6}>
                  {steps.map((i) => {
                    // Decode text outputs (Markdown)
                    const textRaw = generation?.text_output?.[i];
                    const text = textRaw ? safeBase64Decode(textRaw) : undefined;

                    console.log("text", text);
                    
                    const codeRaw = generation?.code_blocks?.[i];
                    const code =
                      codeRaw !== undefined
                        ? decodeCodeBlock(codeRaw)
                        : undefined;
                    
                    // Decode execution outputs
                    const outputRaw = generation?.execution_outputs?.[i];
                    const output = outputRaw ? safeBase64Decode(outputRaw) : undefined;

                    return (
                      <Box key={i}>
                        <Heading size="xs" mb={2}>
                          Step {i + 1}
                        </Heading>
                        <Flex direction="column" gap={3}>
                          {text && (
                            <Box>
                              <Text fontSize="xs" color="neutral.600" mb={1}>
                                Explanation
                              </Text>
                              <Box fontSize="sm" css={{
                                "& p": { mb: 2 },
                                "& ul, & ol": { pl: 4, mb: 2 },
                              }}>
                                <Markdown remarkPlugins={[remarkBreaks]}>{text}</Markdown>
                              </Box>
                            </Box>
                          )}
                          {code !== undefined && <CodeBlockViewer code={code} />}
                          {output && (
                            <Box
                              border="1px solid"
                              borderColor="neutral.300"
                              rounded="md"
                              overflow="hidden"
                            >
                              <Flex
                                justify="space-between"
                                align="center"
                                bg="neutral.50"
                                px={3}
                                py={2}
                              >
                                <Text fontSize="xs" color="neutral.600">
                                  Execution output
                                </Text>
                              </Flex>
                              <Box
                                as="pre"
                                m={0}
                                p={3}
                                bg="neutral.25"
                                overflowX="auto"
                              >
                                <Code whiteSpace="pre">{output}</Code>
                              </Box>
                            </Box>
                          )}
                        </Flex>
                        <Separator my={4} />
                      </Box>
                    );
                  })}
                  {generation?.source_urls &&
                    generation.source_urls.length > 0 && (
                      <Box>
                        <Heading size="xs" mb={2}>
                          Sources
                        </Heading>
                        <Flex direction="column" gap={1}>
                          {generation.source_urls.map((url, idx) => (
                            <Link
                              key={idx}
                              fontSize="xs"
                              color="blue.600"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {url}
                            </Link>
                          ))}
                        </Flex>
                      </Box>
                    )}
                </Flex>
              )}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
