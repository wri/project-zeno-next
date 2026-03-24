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
  Link,
  IconButton,
  Button,
} from "@chakra-ui/react";
import { DownloadSimpleIcon as DownloadSimple, CopyIcon as Copy, CheckIcon as Check, TerminalWindowIcon as Terminal, XIcon as X, LinkIcon as LinkSimple, ArrowSquareOutIcon as ArrowSquareOut } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { InsightGeneration } from "@/app/types/chat";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { fetchExternalData } from "@/app/actions/fetch-data";
import { Tooltip } from "@/app/components/ui/tooltip";
import JSZip from "jszip";
import Image from "next/image";

const API_DOCS_URL = "https://analytics.globalnaturewatch.org/docs";

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
        borderBottomWidth="1px"
        borderColor="neutral.300"
      >
        <Flex gap={2} align="center">
          <Image src="/python-logo.svg" alt="Python" width={14} height={14} />
          <Text fontSize="xs" color="neutral.600">
            Code
          </Text>
        </Flex>
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
      <Box m={0} p={0} bg="white" overflowX="auto">
        <SyntaxHighlighter
          language="python"
          style={vs}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.875rem",
            backgroundColor: "transparent",
            border: "none",
          }}
          wrapLongLines
        >
          {code}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
}


function ApiSourceCard({ url }: { url: string }) {
  const { copy, copied } = useClipboard({ value: url });
  let baseUrl = url;
  let params: [string, string][] = [];
  try {
    const parsed = new URL(url);
    baseUrl = `${parsed.origin}${parsed.pathname}`;
    params = Array.from(parsed.searchParams.entries());
  } catch {
    // keep url as-is
  }

  return (
    <Box border="1px solid" borderColor="neutral.300" rounded="md" overflow="hidden">
      <Flex
        justify="space-between"
        align="center"
        bg="neutral.50"
        px={3}
        py={2}
        borderBottomWidth="1px"
        borderColor="neutral.300"
      >
        <Flex gap={2} align="center">
          <LinkSimple size={14} />
          <Text fontSize="xs" color="neutral.600">API Source</Text>
        </Flex>
        <Flex gap={2}>
          <Tooltip content="Open in new tab">
            <Link href={url} target="_blank" rel="noopener noreferrer">
              <IconButton size="xs" variant="outline" aria-label="Open API source">
                <ArrowSquareOut />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip content="Copy URL">
            <IconButton size="xs" variant="outline" onClick={copy} aria-label="Copy URL">
              {copied ? <Check /> : <Copy />}
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
      <Box p={3} bg="white">
        <Code fontSize="xs" color="neutral.700" bg="transparent" display="block" wordBreak="break-all" mb={params.length > 0 ? 2 : 0}>
          {baseUrl}
        </Code>
        {params.length > 0 && (
          <Flex direction="column" gap={0.5}>
            {params.map(([key, value]) => (
              <Flex key={key} gap={2} align="baseline">
                <Code fontSize="xs" color="neutral.500" bg="transparent" fontWeight="medium" flexShrink={0}>{key}</Code>
                <Code fontSize="xs" color="neutral.600" bg="transparent" wordBreak="break-all">{value}</Code>
              </Flex>
            ))}
          </Flex>
        )}
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

  const apiUrls = useMemo(() => {
    if (generation?.source_urls && generation.source_urls.length > 0) {
      return generation.source_urls;
    }
    const codeBlocks = (generation?.codeact_parts || [])
      .filter((p) => p.type === "code_block")
      .map((p) => safeBase64Decode(p.content));
    return codeBlocks.flatMap((code) => extractDataUrls(code));
  }, [generation]);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size="md"
      placement="end"
    >
      <Portal>
        <Drawer.Backdrop zIndex={1000} top={{ md: 12 }} />
        <Drawer.Positioner zIndex={1200} top={{ md: 12 }}>
          <Drawer.Content bg="neutral.200" maxH="calc(100vh - 3rem)">
            <Drawer.Header
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              pt={5}
              pb={3}
            >
              <Heading size="sm" m={0} maxW="calc(100% - 80px)">
                {title ? `${title}` : "How this was generated"}
              </Heading>
              <Drawer.CloseTrigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  color="neutral.600"
                  borderColor="neutral.300"
                  bg="white"
                  h={6}
                  rounded="sm"
                >
                  <X />
                  Close
                </Button>
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body bg="neutral.200" pt={0}>
              {/* Approach B: always-visible API info banner */}
              {apiUrls.length > 0 && (
                <Box
                  mx={-6}
                  mt={-2}
                  mb={4}
                  px={6}
                  py={2.5}
                  bg="blue.50"
                  borderBottomWidth="1px"
                  borderColor="blue.100"
                >
                  <Flex align="center" justify="space-between" gap={3}>
                    <Text fontSize="xs" fontWeight="medium" color="blue.700">
                      {apiUrls.length} {apiUrls.length === 1 ? "API call" : "API calls"} made to generate this insight
                    </Text>
                    <Link
                      href={API_DOCS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      fontSize="xs"
                      color="blue.600"
                      fontWeight="medium"
                      textDecoration="underline"
                      whiteSpace="nowrap"
                      _hover={{ color: "blue.800" }}
                    >
                      API docs →
                    </Link>
                  </Flex>
                </Box>
              )}
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
                                  "& ul, & ol": { pl: 4, mb: 2 },
                                }}
                              >
                                <Markdown
                                  remarkPlugins={[remarkBreaks]}
                                  components={{
                                    // Use div instead of p to avoid invalid nesting when
                                    // remarkBreaks injects block-level br elements inside paragraphs
                                    p: ({ node: _, ...props }) => <Box mb={2} {...props} />,
                                    br: () => <Box h={2} />,
                                    h1: ({ node: _, ...props }) => (
                                      <>
                                        <Separator my={4} borderColor="neutral.300" />
                                        <Heading as="h1" size="sm" mb={2} {...props} />
                                      </>
                                    ),
                                    h2: ({ node: _, ...props }) => (
                                      <>
                                        <Separator my={4} borderColor="neutral.300" />
                                        <Heading as="h2" size="xs" mb={2} {...props} />
                                      </>
                                    ),
                                    h3: ({ node: _, ...props }) => (
                                      <>
                                        <Separator my={4} borderColor="neutral.300" />
                                        <Heading as="h3" size="xs" mb={2} {...props} />
                                      </>
                                    ),
                                  }}
                                >
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
                                borderBottomWidth="1px"
                                borderColor="neutral.300"
                              >
                                <Flex gap={2} align="center">
                                  <Terminal size={14} />
                                  <Text fontSize="xs" color="neutral.600">
                                    Execution output
                                  </Text>
                                </Flex>
                                <Flex gap={2}>
                                  <Tooltip content="Copy">
                                    <IconButton
                                      size="xs"
                                      variant="outline"
                                      onClick={() => navigator.clipboard.writeText(content)}
                                      aria-label="Copy output"
                                    >
                                      <Copy />
                                    </IconButton>
                                  </Tooltip>
                                </Flex>
                              </Flex>
                              <Box
                                as="pre"
                                m={0}
                                p={3}
                                bg="white"
                                overflowX="auto"
                              >
                                <Code whiteSpace="pre" bg="transparent" display="block">{content}</Code>
                              </Box>
                            </Box>
                          )}
                        </Flex>
                      </Box>
                    );
                  })}
                  {apiUrls.length > 0 && apiUrls.map((url, idx) => (
                    <ApiSourceCard key={idx} url={url} />
                  ))}
                </Flex>
              )}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
