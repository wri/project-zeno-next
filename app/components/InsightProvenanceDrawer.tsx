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
import type { InsightGeneration } from "@/app/types/chat";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";

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
      <Box m={0} p={0} bg="neutral.25" overflowX="auto">
        <SyntaxHighlighter
          language="python"
          style={vs}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.875rem",
            backgroundColor: "transparent",
          }}
          wrapLongLines
        >
          {code}
        </SyntaxHighlighter>
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
  const parts = generation?.codeact_parts || [];

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
              {parts.length === 0 ? (
                <Text fontSize="sm" color="neutral.600">
                  No generation details available.
                </Text>
              ) : (
                <Flex direction="column" gap={3}>
                  {parts.map((part, i) => {
                    const content = safeBase64Decode(part.content);

                    return (
                      <Box key={i}>
                        <Flex direction="column" gap={3}>
                          {part.type === "text_output" && (
                            <Box>
                              <Box
                                fontSize="sm"
                                css={{
                                  "& p": { mb: 2 },
                                  "& ul, & ol": { pl: 4, mb: 2 },
                                }}
                              >
                                <Markdown remarkPlugins={[remarkBreaks]}>
                                  {content}
                                </Markdown>
                              </Box>
                            </Box>
                          )}
                          {part.type === "code_block" && (
                            <CodeBlockViewer code={content} />
                          )}
                          {part.type === "execution_output" && (
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
                                <Code whiteSpace="pre">{content}</Code>
                              </Box>
                            </Box>
                          )}
                        </Flex>
                        {i < parts.length - 1 && <Separator my={3} />}
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
