"use client";
import {
  Box,
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
  IconButton,
} from "@chakra-ui/react";
import { DownloadSimpleIcon as DownloadSimple, CopyIcon as Copy, CheckIcon as Check } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { InsightGeneration } from "@/app/types/chat";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { fetchExternalData } from "@/app/actions/fetch-data";
import { Tooltip } from "@/app/components/ui/tooltip";
import JSZip from "jszip";

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

// --- Data Fetching & CSV Conversion ---

async function fetchAndConvertToCsv(url: string): Promise<{ csv: string; filename: string }> {
  const json = await fetchExternalData(url);

  // Access nested result structure
  const result = json.data?.result;
  if (!result) throw new Error("Invalid data format");

  // Convert column-oriented to CSV
  const columns = Object.keys(result);
  if (columns.length === 0) throw new Error("No data found");

  const rowCount = result[columns[0]].length;
  
  const csvRows = [columns.join(",")];

  for (let i = 0; i < rowCount; i++) {
    const row = columns.map(col => {
      const val = result[col][i];
      if (val === null || val === undefined) return "";
      const strVal = String(val);
      if (strVal.includes(",")) return `"${strVal}"`;
      return strVal;
    });
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");
  let filename = url.split("/").pop() || "data";
  if (!filename.endsWith(".csv")) {
    filename += ".csv";
  }
  return { csv, filename };
}

function triggerDownload(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const urlObj = URL.createObjectURL(blob);
  link.setAttribute("href", urlObj);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(urlObj);
}

// Regex to find http/https URLs inside quotes
function extractDataUrls(code: string): string[] {
  const urlRegex = /(?:["'])(https?:\/\/[^"'\s]+)(?:["'])/g;
  const matches = [];
  let match;
  while ((match = urlRegex.exec(code)) !== null) {
    matches.push(match[1]);
  }
  return Array.from(new Set(matches));
}

// --- Components ---

function CodeBlockViewer({ code }: { code: string }) {
  const { copy, copied } = useClipboard({ value: code });
  const [downloading, setDownloading] = useState(false);
  
  const dataUrls = useMemo(() => extractDataUrls(code), [code]);

  const handleDownload = async () => {
    if (dataUrls.length === 0) return;
    setDownloading(true);
    try {
      if (dataUrls.length === 1) {
        // Single file download
        const { csv, filename } = await fetchAndConvertToCsv(dataUrls[0]);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        triggerDownload(blob, filename);
      } else {
        // Multiple files - ZIP
        const zip = new JSZip();
        const results = await Promise.all(
          dataUrls.map(url => fetchAndConvertToCsv(url))
        );
        
        results.forEach(({ csv, filename }) => {
          zip.file(filename, csv);
        });
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(zipBlob, "source_files.zip");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download data.");
    } finally {
      setDownloading(false);
    }
  };

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
        <Flex gap={2}>
          {dataUrls.length > 0 && (
            <Tooltip content="Download Source files">
              <IconButton
                size="xs"
                variant="outline"
                onClick={handleDownload}
                disabled={downloading}
                aria-label="Download Source files"
              >
                <DownloadSimple />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip content="Copy">
            <IconButton
              size="xs"
              variant="outline"
              onClick={copy}
              aria-label="Copy code"
            >
              {copied ? <Check /> : <Copy />}
            </IconButton>
          </Tooltip>
        </Flex>
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
        <Drawer.Backdrop zIndex={1000} />
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
                <Flex direction="column" gap={6}>
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
                        {i < parts.length - 1 && <Separator my={4} />}
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
