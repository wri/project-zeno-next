"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  IconButton,
  Textarea,
  Text,
  Button,
  Spinner,
  Input,
} from "@chakra-ui/react";
import {
  DotsSixVerticalIcon,
  XIcon,
  PencilSimpleIcon,
  SparkleIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import mockGenerateText, {
  MOCK_TEXT_PREFIX,
} from "@/app/lib/portfolio/mockGenerateText";
import type { Report, AreaDashboard } from "@/app/types/portfolio";

type Props = {
  text: string;
  onChange: (text: string) => void;
  onRemove?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  source?: "user" | "chat";
  // Workspace + block id are required to generate text — the mock service
  // takes the surrounding workspace as context. When omitted the Generate
  // affordance is hidden (read-only contexts).
  workspace?: Report | AreaDashboard;
  blockId?: string;
};

// Used to render generated mock copy with a distinctive "AI" label.
const isMockGenerated = (s: string) => s.startsWith(MOCK_TEXT_PREFIX);

const markdownCss = {
  fontSize: "xs",
  lineHeight: "1.55",
  color: "fg",
  "& > p:not(:last-of-type)": { mb: 2 },
  "& strong": { fontWeight: "semibold" },
  "& em": { fontStyle: "italic" },
  "& ul, & ol": { pl: 4, mb: 2 },
  "& li": { mb: 0.5 },
  "& a": { color: "primary.fg", textDecoration: "underline" },
};

export default function AnnotationBlock({
  text,
  onChange,
  onRemove,
  dragHandleProps,
  source = "user",
  workspace,
  blockId,
}: Props) {
  const [editing, setEditing] = useState(text.length === 0);
  const [generating, setGenerating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState("");

  const isGenerated = isMockGenerated(text);
  const canGenerate = Boolean(workspace && blockId);

  async function handleGenerate(promptOverride?: string) {
    if (!workspace || !blockId) return;
    const finalPrompt = (
      promptOverride ?? prompt ?? "Write a short summary of this workspace"
    ).trim();
    setGenerating(true);
    setShowPrompt(false);
    try {
      const generated = await mockGenerateText({
        workspace,
        focusBlockId: blockId,
        prompt: finalPrompt,
      });
      onChange(generated);
      setEditing(false);
    } finally {
      setGenerating(false);
      setPrompt("");
    }
  }

  return (
    <Box
      position="relative"
      bg={isGenerated ? "purple.subtle" : "orange.subtle"}
      border="1.5px dashed"
      borderColor={isGenerated ? "purple.muted" : "orange.muted"}
      rounded="md"
      p={3}
      minH="120px"
      display="flex"
      flexDir="column"
    >
      <Flex justify="space-between" align="center" mb={1.5} gap={1}>
        <Flex gap={1.5} align="center">
          <Text
            fontSize="2xs"
            color={isGenerated ? "purple.fg" : "orange.fg"}
            fontWeight="semibold"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            {isGenerated
              ? "AI note ✨"
              : source === "chat"
                ? "From chat ✏️"
                : "Note"}
          </Text>
        </Flex>
        <Flex gap={1} align="center">
          {canGenerate && !generating && !editing && (
            <IconButton
              aria-label="Edit annotation"
              size="2xs"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              <PencilSimpleIcon size={12} />
            </IconButton>
          )}
          {canGenerate && !generating && (
            <IconButton
              aria-label="Generate with AI"
              size="2xs"
              variant="ghost"
              color="purple.fg"
              onClick={() => setShowPrompt((v) => !v)}
            >
              <SparkleIcon size={12} />
            </IconButton>
          )}
          {onRemove && (
            <IconButton
              aria-label="Remove annotation"
              size="2xs"
              variant="ghost"
              onClick={onRemove}
            >
              <XIcon size={12} />
            </IconButton>
          )}
          {dragHandleProps && (
            <Box
              {...dragHandleProps}
              cursor="grab"
              color="fg.muted"
              opacity={0.5}
              _hover={{ opacity: 1 }}
              touchAction="none"
            >
              <DotsSixVerticalIcon size={14} />
            </Box>
          )}
        </Flex>
      </Flex>

      {showPrompt && !generating && (
        <Flex
          gap={1}
          mb={1.5}
          align="center"
          bg="bg"
          rounded="sm"
          px={1.5}
          py={1}
          border="1px solid"
          borderColor="purple.muted"
        >
          <SparkleIcon size={12} color="var(--chakra-colors-purple-fg)" />
          <Input
            size="2xs"
            placeholder="Summarise this section…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            border="none"
            _focus={{ boxShadow: "none" }}
            px={0}
            fontSize="2xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerate();
            }}
            autoFocus
          />
          <IconButton
            aria-label="Generate"
            size="2xs"
            variant="ghost"
            color="purple.fg"
            onClick={() => handleGenerate()}
            disabled={!prompt.trim()}
          >
            <PaperPlaneTiltIcon size={12} />
          </IconButton>
        </Flex>
      )}

      {generating ? (
        <Flex
          minH="80px"
          align="center"
          justify="center"
          gap={2}
          color="purple.fg"
          fontSize="xs"
        >
          <Spinner size="sm" />
          <Text>Generating…</Text>
        </Flex>
      ) : editing ? (
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (text.trim().length > 0) setEditing(false);
          }}
          placeholder={
            canGenerate
              ? "Type your annotation, or use ✨ to generate one…"
              : "Type your annotation…"
          }
          autoresize
          rows={3}
          resize="none"
          size="xs"
          bg="transparent"
          border="none"
          color="fg"
          fontSize="xs"
          _focus={{ outline: "none", boxShadow: "none" }}
          px={0}
          autoFocus
        />
      ) : (
        <Box
          cursor="text"
          onClick={() => setEditing(true)}
          css={markdownCss}
        >
          {text ? (
            <Markdown remarkPlugins={[remarkBreaks]}>{text}</Markdown>
          ) : (
            <Text fontSize="xs" color="fg.muted" fontStyle="italic">
              {canGenerate
                ? "Empty note — click to type, or ✨ to generate."
                : "Empty note — click to type."}
            </Text>
          )}
        </Box>
      )}

      {canGenerate && !text && !generating && !editing && !showPrompt && (
        <Button
          size="2xs"
          variant="subtle"
          colorPalette="purple"
          mt={1}
          alignSelf="flex-start"
          onClick={() => setShowPrompt(true)}
        >
          <SparkleIcon size={11} />
          Generate with AI
        </Button>
      )}
    </Box>
  );
}
