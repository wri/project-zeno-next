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
import { DownloadSimpleIcon as DownloadSimple, CopyIcon as Copy, CheckIcon as Check, TerminalWindowIcon as Terminal, XIcon as X } from "@phosphor-icons/react";
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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("chat");
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
      alert(t("provenance.downloadFailed"));
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
            {t("provenance.code")}
          </Text>
        </Flex>
        <Flex gap={2}>
          {dataUrls.length > 0 && (
            <Tooltip content={t("provenance.downloadSource")}>
              <IconButton
                size="xs"
                variant="outline"
                onClick={handleDownload}
                disabled={downloading}
                aria-label={t("provenance.downloadSource")}
              >
                <DownloadSimple />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip content={t("provenance.copyCode")}>
            <IconButton
              size="xs"
              variant="outline"
              onClick={copy}
              aria-label={t("provenance.copyCode")}
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

export default function InsightProvenanceDrawer({
  isOpen,
  onClose,
  generation,
  title,
}: InsightProvenanceDrawerProps) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const parts = generation?.codeact_parts || [];

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
                {title
                  ? `${title}`
                  : t("provenance.defaultTitle")}
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
                  {tc("buttons.close")}
                </Button>
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body bg="neutral.200" pt={0}>
              {parts.length === 0 ? (
                <Text fontSize="sm" color="neutral.600">
                  {t("provenance.noDetails")}
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
                                <Markdown
                                  remarkPlugins={[remarkBreaks]}
                                  components={{
                                    h1: ({ ...props }) => (
                                      <>
                                        <Separator my={4} borderColor="neutral.300" />
                                        <Heading as="h1" size="sm" mb={2} {...props} />
                                      </>
                                    ),
                                    h2: ({ ...props }) => (
                                      <>
                                        <Separator my={4} borderColor="neutral.300" />
                                        <Heading as="h2" size="xs" mb={2} {...props} />
                                      </>
                                    ),
                                    h3: ({ ...props }) => (
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
                                    {t("provenance.executionOutput")}
                                  </Text>
                                </Flex>
                                <Flex gap={2}>
                                  <Tooltip content={t("provenance.copyOutput")}>
                                    <IconButton
                                      size="xs"
                                      variant="outline"
                                      onClick={() => navigator.clipboard.writeText(content)}
                                      aria-label={t("provenance.copyOutput")}
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
                  {generation?.source_urls &&
                    generation.source_urls.length > 0 && (
                      <Box>
                        <Heading size="xs" mb={2}>
                          {t("provenance.sources")}
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
