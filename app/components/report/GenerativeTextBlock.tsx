"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Flex,
  Textarea,
  IconButton,
  Text,
  Button,
  Skeleton,
} from "@chakra-ui/react";
import {
  PaperPlaneRightIcon,
  ArrowCounterClockwiseIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { ReportBlock } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";

type Phase = "input" | "generating" | "error" | "done";

interface Props {
  block: ReportBlock;
  reportId: string;
  /** If true, start in "generating" phase immediately (used by per-widget chat). */
  autoGenerate?: boolean;
  /** The prompt to auto-generate with (when autoGenerate is true). */
  autoPrompt?: string;
  /** Called with the prompt when the user submits. Parent handles generation. */
  onGenerate: (prompt: string) => Promise<string>;
  /** Called when generation completes or is abandoned (so parent can clean up tracking state). */
  onGenerationComplete?: () => void;
  /** Override for updateBlockContent (defaults to useReportStore) */
  onUpdateContent?: (
    reportId: string,
    blockId: string,
    content: string,
  ) => void;
}

export default function GenerativeTextBlock({
  block,
  reportId,
  autoGenerate,
  autoPrompt,
  onGenerate,
  onGenerationComplete,
  onUpdateContent,
}: Props) {
  const store = useReportStore();
  const updateBlockContent = onUpdateContent ?? store.updateBlockContent;
  const [phase, setPhase] = useState<Phase>(
    autoGenerate ? "generating" : "input",
  );
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoRun = useRef(false);

  // Auto-generate on mount if requested
  useEffect(() => {
    if (autoGenerate && autoPrompt && !hasAutoRun.current) {
      hasAutoRun.current = true;
      runGeneration(autoPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runGeneration = async (text: string) => {
    setLastPrompt(text);
    setPhase("generating");
    setErrorMessage("");
    try {
      const result = await onGenerate(text);
      updateBlockContent(reportId, block.id, result);
      setPhase("done");
      onGenerationComplete?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      console.error("[GenerativeTextBlock] Generation failed:", err);
      setErrorMessage(message);
      setPhase("error");
    }
  };

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    runGeneration(trimmed);
  };

  const handleRetry = () => {
    if (lastPrompt) {
      runGeneration(lastPrompt);
    } else {
      setPhase("input");
    }
  };

  const handleDismiss = () => {
    setPhase("done");
    onGenerationComplete?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Input phase ──────────────────────────────────────────────────
  if (phase === "input") {
    return (
      <Box>
        <Flex gap={2} align="flex-end">
          <Textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this data…"
            variant="outline"
            size="sm"
            minH="40px"
            maxH="100px"
            resize="none"
            rows={1}
            fontSize="sm"
            autoFocus
          />
          <IconButton
            aria-label="Generate text"
            size="sm"
            colorPalette="primary"
            variant="solid"
            onClick={handleSubmit}
            disabled={!prompt.trim()}
          >
            <PaperPlaneRightIcon size={16} />
          </IconButton>
        </Flex>
        <Text fontSize="2xs" color="fg.subtle" mt={1}>
          AI will generate text based on the report context and your prompt.
        </Text>
      </Box>
    );
  }

  // ── Generating phase ─────────────────────────────────────────────
  if (phase === "generating") {
    return (
      <Box>
        <Flex direction="column" gap={2}>
          <Skeleton height="12px" width="90%" />
          <Skeleton height="12px" width="100%" />
          <Skeleton height="12px" width="75%" />
          <Skeleton height="12px" width="85%" />
          <Skeleton height="12px" width="60%" />
        </Flex>
        <Text fontSize="2xs" color="fg.subtle" mt={2}>
          Generating…
        </Text>
      </Box>
    );
  }

  // ── Error phase ──────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <Box
        bg="bg.error"
        border="1px solid"
        borderColor="border.error"
        rounded="md"
        px={3}
        py={3}
      >
        <Flex align="center" gap={2} mb={1}>
          <WarningCircleIcon
            size={16}
            weight="fill"
            color="var(--chakra-colors-red-500)"
          />
          <Text fontSize="sm" fontWeight="medium" color="fg.error">
            Generation failed
          </Text>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mb={3}>
          {errorMessage}
        </Text>
        <Flex gap={2}>
          <Button size="xs" variant="outline" onClick={handleRetry}>
            <ArrowCounterClockwiseIcon size={14} />
            Retry
          </Button>
          <Button size="xs" variant="ghost" onClick={handleDismiss}>
            Dismiss
          </Button>
        </Flex>
      </Box>
    );
  }

  // ── Done phase — render as regular editable text block ───────────
  return null;
}
