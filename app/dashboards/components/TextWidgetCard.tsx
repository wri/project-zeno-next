"use client";

import { useState } from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import {
  ArrowsOutCardinalIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  PencilSimpleIcon,
  CheckIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Tooltip } from "@/app/components/ui/tooltip";
import MarkdownEditor from "@/app/dashboards/components/MarkdownEditor";

// Text/narrative widget. Toolbar: Arrange (drag handle) / Expand / Edit /
// Delete over a plain body — no titled header.
export default function TextWidgetCard({
  text,
  onChange,
  onDelete,
  expanded,
  onToggleExpand,
  arrange,
}: {
  text: string;
  onChange: (next: string) => void;
  onDelete: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  arrange?: { onMouseDown?: () => void; onMouseUp?: () => void };
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };
  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  return (
    <Box
      rounded="md"
      borderWidth="1px"
      borderColor="border"
      bg="bg"
      overflow="hidden"
      h="100%"
    >
      {/* Toolbar — icon-only controls, matching the insight cards */}
      <Flex
        px={2}
        py={1.5}
        align="center"
        justify="flex-end"
        gap={0.5}
        color="neutral.500"
      >
        <Tooltip content="Drag to reorder" showArrow>
          <IconButton
            aria-label="Drag to reorder"
            size="2xs"
            variant="ghost"
            cursor="grab"
            onMouseDown={arrange?.onMouseDown}
            onMouseUp={arrange?.onMouseUp}
          >
            <ArrowsOutCardinalIcon size={14} />
          </IconButton>
        </Tooltip>
        {onToggleExpand && (
          <Tooltip
            content={
              expanded ? "Collapse to one column" : "Expand to full width"
            }
            showArrow
          >
            <IconButton
              aria-label="Toggle width"
              size="2xs"
              variant="ghost"
              onClick={onToggleExpand}
            >
              {expanded ? (
                <ArrowsInIcon size={14} />
              ) : (
                <ArrowsOutIcon size={14} />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip content={editing ? "Save" : "Edit"} showArrow>
          <IconButton
            aria-label={editing ? "Save note" : "Edit note"}
            size="2xs"
            variant="ghost"
            onClick={editing ? commit : startEdit}
          >
            {editing ? <CheckIcon size={14} /> : <PencilSimpleIcon size={14} />}
          </IconButton>
        </Tooltip>
        <IconButton
          aria-label="Remove note"
          size="2xs"
          variant="ghost"
          onClick={onDelete}
        >
          <TrashIcon size={14} />
        </IconButton>
      </Flex>

      {/* Body */}
      <Box px={4} pb={4} pt={1}>
        {editing ? (
          <MarkdownEditor value={draft} onChange={setDraft} />
        ) : (
          <Box
            fontSize="sm"
            color="fg.muted"
            css={{
              "& > * + *": { marginTop: "8px" },
              "& h1, & h2, & h3": {
                fontWeight: 600,
                color: "var(--chakra-colors-fg)",
              },
              "& h2": { fontSize: "18px" },
              "& ul": { paddingLeft: "20px", listStyle: "disc" },
              "& ol": { paddingLeft: "20px", listStyle: "decimal" },
              "& strong": { fontWeight: 600 },
              "& a": {
                color: "var(--chakra-colors-fg-link)",
                textDecoration: "underline",
              },
            }}
          >
            <Markdown remarkPlugins={[remarkBreaks]}>{text}</Markdown>
          </Box>
        )}
      </Box>
    </Box>
  );
}
